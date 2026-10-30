from django.contrib import admin

from .models import Item, Look, SavedProduct


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'owner', 'favorite', 'worn_count', 'created_at']
    list_filter = ['category', 'favorite']
    search_fields = ['name', 'owner__email']


@admin.register(Look)
class LookAdmin(admin.ModelAdmin):
    list_display = ['name', 'vibe', 'owner', 'created_at']
    search_fields = ['name', 'owner__email']


@admin.register(SavedProduct)
class SavedProductAdmin(admin.ModelAdmin):
    list_display = ['title', 'source', 'owner', 'created_at']
    search_fields = ['title', 'owner__email']
