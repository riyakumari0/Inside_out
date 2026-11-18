import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import serializers, status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from wardrobe.images import clean_upload

from .models import ContactMessage, Profile

User = get_user_model()
logger = logging.getLogger(__name__)


def user_payload(user):
    profile = Profile.objects.filter(user=user).first()
    return {
        'name': user.first_name or user.username,
        'email': user.email,
        'avatar': profile.avatar.url if profile and profile.avatar else None,
        'isAdmin': user.is_staff,
    }


def delete_user_and_files(user):
    """Deletes the account and every photo it uploaded (pieces, generated looks, avatar)."""
    files = [f for i in user.items.all() for f in (i.image, i.cutout)] + [f for l in user.looks.all() for f in (l.image, l.collage)]
    profile = Profile.objects.filter(user=user).first()
    if profile:
        files.append(profile.avatar)
    for f in files:
        if f:
            f.delete(save=False)
    user.delete()


def check_new_password(password, user):
    try:
        validate_password(password, user=user)
    except DjangoValidationError as err:
        raise serializers.ValidationError({'password': list(err.messages)})


class SignUpSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('An account with this email already exists. Try logging in.')
        return value

    def validate(self, data):
        check_new_password(data['password'], User(username=data['email'], email=data['email'], first_name=data['name']))
        return data


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['name', 'email', 'message']


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfView(APIView):
    """Sets the csrftoken cookie the React app sends back in X-CSRFToken."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'ok': True})


class MeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'user': None})
        # The app calls this every time it opens, so it doubles as "last seen" for the admin panel
        now = timezone.now()
        profile, _ = Profile.objects.get_or_create(user=request.user)
        if not profile.last_seen or now - profile.last_seen > timedelta(hours=1):
            profile.last_seen = now
            profile.save(update_fields=['last_seen'])
        return Response({'user': user_payload(request.user)})


# DRF skips CSRF checks for anonymous requests, so login/signup opt back in explicitly
@method_decorator(csrf_protect, name='dispatch')
class SignUpView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = SignUpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = User.objects.create_user(
            username=data['email'], email=data['email'], password=data['password'], first_name=data['name'].strip(),
        )
        login(request, user)
        return Response({'user': user_payload(user)}, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name='dispatch')
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data['email'].strip().lower(),
            password=serializer.validated_data['password'],
        )
        if user is None:
            return Response({'detail': 'Email or password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        login(request, user)
        return Response({'user': user_payload(user)})


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name='dispatch')
class ContactView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'contact'

    def post(self, request):
        serializer = ContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'ok': True}, status=status.HTTP_201_CREATED)


class ProfileSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    email = serializers.EmailField(required=False)
    currentPassword = serializers.CharField(required=False, write_only=True)


class ProfileView(APIView):
    """Edit name and email. Changing the email (the login) needs the current password."""
    throttle_scope = 'auth'

    def patch(self, request):
        serializer = ProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = request.user

        email = data.get('email', '').strip().lower()
        if email and email != user.email:
            if not user.check_password(data.get('currentPassword', '')):
                raise serializers.ValidationError({'currentPassword': 'Enter your current password to change your email.'})
            if User.objects.filter(username=email).exists():
                raise serializers.ValidationError({'email': 'An account with this email already exists.'})
            user.username = user.email = email
        if data.get('name', '').strip():
            user.first_name = data['name'].strip()
        user.save()
        return Response({'user': user_payload(user)})


class ChangePasswordView(APIView):
    throttle_scope = 'auth'

    def post(self, request):
        current, new = request.data.get('currentPassword', ''), request.data.get('newPassword', '')
        if not request.user.check_password(current):
            raise serializers.ValidationError({'currentPassword': 'Your current password is incorrect.'})
        check_new_password(new, request.user)
        request.user.set_password(new)
        request.user.save()
        update_session_auth_hash(request, request.user)  # stay logged in here, log out other devices
        return Response(status=status.HTTP_204_NO_CONTENT)


class AvatarView(APIView):
    parser_classes = [MultiPartParser]
    throttle_scope = 'analyze'

    def post(self, request):
        upload = request.FILES.get('image')
        if not upload:
            raise serializers.ValidationError({'image': 'Attach a photo.'})
        cleaned = clean_upload(upload)
        profile, _ = Profile.objects.get_or_create(user=request.user)
        if profile.avatar:
            profile.avatar.delete(save=False)
        profile.avatar.save('avatar.jpg', cleaned, save=True)
        return Response({'user': user_payload(request.user)})

    def delete(self, request):
        profile = Profile.objects.filter(user=request.user).first()
        if profile and profile.avatar:
            profile.avatar.delete(save=True)
        return Response({'user': user_payload(request.user)})


class DeleteAccountView(APIView):
    """Permanently removes the account, closet, looks, bag and all uploaded photos."""
    throttle_scope = 'auth'

    def post(self, request):
        user = request.user
        if not user.check_password(request.data.get('password', '')):
            raise serializers.ValidationError({'password': 'Your password is incorrect.'})
        logout(request)
        delete_user_and_files(user)
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name='dispatch')
class PasswordResetRequestView(APIView):
    """Emails a reset link. Always answers the same, so nobody can test which emails have accounts."""
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        user = User.objects.filter(username=email, is_active=True).first()
        if user and user.has_usable_password():
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f'{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}'
            try:
                send_mail(
                    'Reset your Inside & Out password',
                    f'Hi {user.first_name or "there"},\n\nReset your password here (the link works once and expires in 3 days):\n{link}\n\n'
                    "If you didn't ask for this, you can ignore this email.",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                )
            except Exception as err:  # never reveal delivery problems to the requester
                logger.error('Password reset email failed: %s', err)
        return Response({'ok': True})


@method_decorator(csrf_protect, name='dispatch')
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        invalid = serializers.ValidationError({'detail': 'This reset link is invalid or has expired. Please request a new one.'})
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(str(request.data.get('uid', '')))))
        except (User.DoesNotExist, ValueError, TypeError):
            raise invalid
        if not default_token_generator.check_token(user, str(request.data.get('token', ''))):
            raise invalid
        password = str(request.data.get('password', ''))
        check_new_password(password, user)
        user.set_password(password)
        user.save()
        return Response({'ok': True})


class SupportSerializer(serializers.ModelSerializer):
    topic = serializers.ChoiceField(choices=[t for t in ContactMessage.TOPICS if t != 'contact'])
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    repliedAt = serializers.DateTimeField(source='replied_at', read_only=True)

    class Meta:
        model = ContactMessage
        fields = ['id', 'topic', 'message', 'status', 'reply', 'createdAt', 'repliedAt']
        read_only_fields = ['status', 'reply']


class SupportView(APIView):
    """Help & Support for members: report a problem and see the owner's replies."""
    throttle_scope = 'support'

    def get_throttles(self):
        return super().get_throttles() if self.request.method == 'POST' else []

    def get(self, request):
        tickets = ContactMessage.objects.filter(user=request.user)
        return Response({'tickets': SupportSerializer(tickets, many=True).data})

    def post(self, request):
        serializer = SupportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save(
            user=request.user, name=request.user.first_name or request.user.email, email=request.user.email,
        )
        return Response(SupportSerializer(ticket).data, status=status.HTTP_201_CREATED)


class HealthView(APIView):
    """For uptime checks and the deploy platform. Shows which optional services are configured, never the keys."""
    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request):
        return Response({'status': 'ok', 'gemini': bool(settings.GEMINI_API_KEY), 'shopping': bool(settings.SERPAPI_KEY)})
