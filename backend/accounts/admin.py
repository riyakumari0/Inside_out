from django.contrib import admin

from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'topic', 'status', 'created_at']
    list_filter = ['status', 'topic']
    search_fields = ['name', 'email', 'message']
