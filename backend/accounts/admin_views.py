"""
The in-app admin panel API (/api/admin-panel/...). Staff accounts only.

Admins see accounts, activity counts and contact messages. They never see the
contents of anyone's closet: pieces and photos stay private to their owner.
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from wardrobe.constants import CATEGORIES, VIBES
from wardrobe.models import Item, Look, SavedProduct

from .models import ContactMessage, Profile
from .views import delete_user_and_files

User = get_user_model()
logger = logging.getLogger(__name__)


class AdminView(APIView):
    permission_classes = [IsAdminUser]
    throttle_classes = []


def admin_user_payload(user):
    profile = Profile.objects.filter(user=user).first()
    return {
        'id': user.id,
        'name': user.first_name or user.username,
        'email': user.email,
        'avatar': profile.avatar.url if profile and profile.avatar else None,
        'isActive': user.is_active,
        'isAdmin': user.is_staff,
        'joined': user.date_joined,
        'lastSeen': max(filter(None, [user.last_login, profile.last_seen if profile else None]), default=None),
        'items': getattr(user, 'item_count', None),
        'looks': getattr(user, 'look_count', None),
    }


def users_with_counts():
    return User.objects.annotate(
        item_count=Count('items', distinct=True),
        look_count=Count('looks', distinct=True),
    )


class StatsView(AdminView):
    def get(self, request):
        week_ago = timezone.now() - timedelta(days=7)
        by_category = dict(Item.objects.values_list('category').annotate(n=Count('id')))
        by_vibe = dict(Look.objects.exclude(vibe='').values_list('vibe').annotate(n=Count('id')))
        recent_looks = Look.objects.select_related('owner').order_by('-created_at')[:6]
        return Response({
            'users': User.objects.count(),
            'activeUsers': User.objects.filter(is_active=True).count(),
            'newUsersThisWeek': User.objects.filter(date_joined__gte=week_ago).count(),
            'activeThisWeek': User.objects.filter(
                Q(last_login__gte=week_ago) | Q(profile__last_seen__gte=week_ago), is_active=True,
            ).distinct().count(),
            'activeToday': User.objects.filter(
                Q(last_login__gte=timezone.now() - timedelta(days=1)) | Q(profile__last_seen__gte=timezone.now() - timedelta(days=1)),
                is_active=True,
            ).distinct().count(),
            'items': Item.objects.count(),
            'looks': Look.objects.count(),
            'looksThisWeek': Look.objects.filter(created_at__gte=week_ago).count(),
            'bagProducts': SavedProduct.objects.count(),
            'messages': ContactMessage.objects.count(),
            'openComplaints': ContactMessage.objects.filter(status='open').count(),
            'itemsByCategory': [{'category': c, 'count': by_category.get(c, 0)} for c in CATEGORIES],
            'looksByVibe': sorted(
                [{'vibe': v, 'label': VIBES.get(v, v), 'count': n} for v, n in by_vibe.items()],
                key=lambda row: -row['count'],
            ),
            'recentLooks': [
                {'name': l.name, 'event': l.event, 'vibe': VIBES.get(l.vibe, ''), 'owner': l.owner.first_name or l.owner.email,
                 'createdAt': l.created_at}
                for l in recent_looks
            ],
            'services': {'gemini': bool(settings.GEMINI_API_KEY), 'shopping': bool(settings.SERPAPI_KEY)},
        })


class UserListView(AdminView):
    def get(self, request):
        users = users_with_counts().order_by('-date_joined')
        q = request.query_params.get('q', '').strip()
        if q:
            users = users.filter(Q(email__icontains=q) | Q(first_name__icontains=q))
        return Response({'users': [admin_user_payload(u) for u in users[:500]]})


class UserUpdate(serializers.Serializer):
    isActive = serializers.BooleanField(required=False)
    isAdmin = serializers.BooleanField(required=False)


class UserDetailView(AdminView):
    def get_target(self, request, pk):
        user = get_object_or_404(users_with_counts(), pk=pk)
        if user == request.user:
            # Stops an admin locking themselves out or deleting the last admin by accident
            raise serializers.ValidationError({'detail': "You can't change your own account here. Use My Profile."})
        return user

    def patch(self, request, pk):
        user = self.get_target(request, pk)
        params = UserUpdate(data=request.data)
        params.is_valid(raise_exception=True)
        data = params.validated_data
        if 'isActive' in data:
            user.is_active = data['isActive']
        if 'isAdmin' in data:
            user.is_staff = data['isAdmin']
        user.save(update_fields=['is_active', 'is_staff'])
        return Response({'user': admin_user_payload(user)})

    def delete(self, request, pk):
        delete_user_and_files(self.get_target(request, pk))
        return Response(status=status.HTTP_204_NO_CONTENT)


def email_reply(message, reply):
    """Members also see replies on their Help & Support page; visitors only get this email."""
    link = f'\n\nSee all your requests: {settings.FRONTEND_URL}/support' if message.user_id else ''
    try:
        send_mail(
            'Inside & Out: a reply to your message',
            f'Hi {message.name},\n\n{reply}\n\nYou wrote:\n> ' + message.message.replace('\n', '\n> ') + link,
            settings.DEFAULT_FROM_EMAIL,
            [message.email],
        )
    except Exception as err:  # the reply is still saved and shown in the app
        logger.error('Reply email failed: %s', err)


def message_payload(m):
    return {
        'id': m.id, 'name': m.name, 'email': m.email, 'message': m.message,
        'topic': m.topic, 'topicLabel': ContactMessage.TOPICS.get(m.topic, m.topic),
        'status': m.status, 'reply': m.reply, 'repliedAt': m.replied_at,
        'userId': m.user_id, 'createdAt': m.created_at,
    }


class MessageListView(AdminView):
    def get(self, request):
        messages = ContactMessage.objects.all()
        status_filter = request.query_params.get('status')
        if status_filter in ContactMessage.STATUSES:
            messages = messages.filter(status=status_filter)
        return Response({
            'messages': [message_payload(m) for m in messages[:500]],
            'open': ContactMessage.objects.filter(status='open').count(),
        })


class MessageUpdate(serializers.Serializer):
    reply = serializers.CharField(max_length=5000, required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=list(ContactMessage.STATUSES), required=False)


class MessageDetailView(AdminView):
    def patch(self, request, pk):
        message = get_object_or_404(ContactMessage, pk=pk)
        params = MessageUpdate(data=request.data)
        params.is_valid(raise_exception=True)
        data = params.validated_data
        if 'reply' in data:
            new_reply = data['reply'].strip()
            if new_reply and new_reply != message.reply:
                email_reply(message, new_reply)
            message.reply = new_reply
            message.replied_at = timezone.now() if new_reply else None
        if 'status' in data:
            message.status = data['status']
        message.save()
        return Response({'message': message_payload(message)})

    def delete(self, request, pk):
        get_object_or_404(ContactMessage, pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
