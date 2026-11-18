import uuid

from django.conf import settings
from django.db import models


def avatar_path(instance, filename):
    return f'avatars/{instance.user_id}/{uuid.uuid4().hex}.jpg'


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to=avatar_path, blank=True, null=True)
    last_seen = models.DateTimeField(null=True, blank=True)  # updated when the app opens, at most hourly

    def __str__(self):
        return f'Profile of {self.user}'


class ContactMessage(models.Model):
    """A message from the public Contact page, or a complaint from a member's Help & Support page."""
    TOPICS = {
        'contact': 'General message',
        'bug': 'Something is broken',
        'stylist': 'Outfits & stylist',
        'upload': 'Uploading pieces',
        'account': 'My account',
        'other': 'Something else',
    }
    STATUSES = {'open': 'Open', 'resolved': 'Resolved'}

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='support_messages')
    name = models.CharField(max_length=120)
    email = models.EmailField()
    topic = models.CharField(max_length=20, choices=list(TOPICS.items()), default='contact')
    message = models.TextField(max_length=5000)
    status = models.CharField(max_length=10, choices=list(STATUSES.items()), default='open')
    reply = models.TextField(max_length=5000, blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} <{self.email}>'
