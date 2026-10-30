import uuid

from django.conf import settings
from django.db import models


def avatar_path(instance, filename):
    return f'avatars/{instance.user_id}/{uuid.uuid4().hex}.jpg'


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to=avatar_path, blank=True, null=True)

    def __str__(self):
        return f'Profile of {self.user}'


class ContactMessage(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    message = models.TextField(max_length=5000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} <{self.email}>'
