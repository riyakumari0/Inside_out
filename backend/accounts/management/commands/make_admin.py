from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Gives an existing account access to the in-app Admin Panel (and Django /admin). Sign up in the app first.'

    def add_arguments(self, parser):
        parser.add_argument('email')
        parser.add_argument('--remove', action='store_true', help='Take admin access away instead')

    def handle(self, email, remove=False, **options):
        user = get_user_model().objects.filter(username=email.strip().lower()).first()
        if user is None:
            raise CommandError(f'No account for {email}. Sign up in the app first, then run this again.')
        user.is_staff = user.is_superuser = not remove
        user.save(update_fields=['is_staff', 'is_superuser'])
        self.stdout.write(self.style.SUCCESS(f'{user.email} is {"no longer" if remove else "now"} an admin.'))
