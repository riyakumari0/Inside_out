import uuid

from django.conf import settings
from django.db import models

from .constants import CATEGORIES


def item_image_path(instance, filename):
    # Random names so uploaded photos can't be guessed from the URL
    return f'wardrobe/{instance.owner_id}/{uuid.uuid4().hex}.jpg'


def look_image_path(instance, filename):
    return f'looks/{instance.owner_id}/{uuid.uuid4().hex}.png'


class Item(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=20, choices=[(c, c) for c in CATEGORIES])
    image = models.ImageField(upload_to=item_image_path, blank=True, null=True)
    colors = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)
    seasons = models.JSONField(default=list, blank=True)
    pattern = models.CharField(max_length=40, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    favorite = models.BooleanField(default=False)
    worn_count = models.PositiveIntegerField(default=0)
    last_worn = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.category})'

    def describe(self):
        """One-line description used in AI prompts."""
        bits = [self.category, ', '.join(self.colors) or 'colour unknown']
        if self.pattern:
            bits.append(self.pattern)
        if self.tags:
            bits.append('vibes: ' + ', '.join(self.tags))
        if self.seasons:
            bits.append('seasons: ' + ', '.join(self.seasons))
        return f'[{self.id}] {self.name} ({"; ".join(bits)})'


class Look(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='looks')
    name = models.CharField(max_length=120)
    vibe = models.CharField(max_length=40, blank=True)
    items = models.ManyToManyField(Item, related_name='looks')
    reasoning = models.TextField(blank=True)
    evaluation = models.JSONField(null=True, blank=True)
    image = models.ImageField(upload_to=look_image_path, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class SavedProduct(models.Model):
    """A product from "shop the gap" the user wants to remember (the Bag)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bag')
    title = models.CharField(max_length=200)
    link = models.URLField(max_length=1000)
    price = models.CharField(max_length=40, blank=True)
    thumbnail = models.URLField(max_length=1000, blank=True)
    source = models.CharField(max_length=80, blank=True)
    note = models.CharField(max_length=200, blank=True)
    look = models.ForeignKey(Look, on_delete=models.SET_NULL, null=True, blank=True, related_name='saved_products')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [models.UniqueConstraint(fields=['owner', 'link'], name='unique_saved_link_per_user')]

    def __str__(self):
        return self.title
