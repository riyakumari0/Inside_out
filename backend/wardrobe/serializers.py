import json

from rest_framework import serializers

from .constants import CATEGORIES, COLORS, SEASONS
from .images import clean_upload
from .models import Item, Look, SavedProduct


class StringListField(serializers.ListField):
    """A list of strings that also accepts a JSON-encoded string (multipart uploads can't send arrays)."""

    def __init__(self, allowed=None, max_items=12, **kwargs):
        self.allowed = allowed
        super().__init__(child=serializers.CharField(max_length=40), max_length=max_items, **kwargs)

    def to_internal_value(self, data):
        if isinstance(data, str):
            try:
                data = json.loads(data or '[]')
            except json.JSONDecodeError:
                raise serializers.ValidationError('Expected a list.')
        values = [v.strip().lower() for v in super().to_internal_value(data) if v.strip()]
        if self.allowed is not None:
            unknown = [v for v in values if v not in self.allowed]
            if unknown:
                raise serializers.ValidationError(f'Unknown value(s): {", ".join(unknown)}')
        return list(dict.fromkeys(values))

    def get_value(self, dictionary):
        # QueryDicts would otherwise be read with getlist()
        return dictionary.get(self.field_name, serializers.empty)


class ImageUrlField(serializers.ImageField):
    def to_internal_value(self, data):
        return clean_upload(super().to_internal_value(data))

    def to_representation(self, value):
        return value.url if value else None


class ItemSerializer(serializers.ModelSerializer):
    image = ImageUrlField(required=False, allow_null=True)
    removeImage = serializers.BooleanField(write_only=True, required=False, default=False)
    category = serializers.ChoiceField(choices=CATEGORIES)
    colors = StringListField(allowed=list(COLORS), required=False)
    seasons = StringListField(allowed=SEASONS, required=False)
    tags = StringListField(required=False)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, coerce_to_string=False, required=False, allow_null=True)
    wornCount = serializers.IntegerField(source='worn_count', read_only=True)
    lastWorn = serializers.DateTimeField(source='last_worn', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Item
        fields = [
            'id', 'name', 'category', 'image', 'removeImage', 'colors', 'tags', 'seasons', 'pattern',
            'price', 'favorite', 'wornCount', 'lastWorn', 'createdAt',
        ]

    def update(self, instance, validated_data):
        if validated_data.pop('removeImage', False) and 'image' not in validated_data:
            instance.image.delete(save=False)
            validated_data['image'] = None
        elif 'image' in validated_data and instance.image:
            instance.image.delete(save=False)
        return super().update(instance, validated_data)

    def create(self, validated_data):
        validated_data.pop('removeImage', None)
        return super().create(validated_data)


class OwnItemsField(serializers.PrimaryKeyRelatedField):
    """Item ids, limited to the requesting user's own wardrobe."""

    def get_queryset(self):
        return Item.objects.filter(owner=self.context['request'].user)


class LookSerializer(serializers.ModelSerializer):
    itemIds = OwnItemsField(source='items', many=True)
    image = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Look
        fields = ['id', 'name', 'vibe', 'itemIds', 'reasoning', 'evaluation', 'image', 'createdAt']

    def get_image(self, look):
        return look.image.url if look.image else None

    def validate_itemIds(self, items):
        if not items:
            raise serializers.ValidationError('A look needs at least one piece.')
        return items


class OwnLookField(serializers.PrimaryKeyRelatedField):
    def get_queryset(self):
        return Look.objects.filter(owner=self.context['request'].user)


class SavedProductSerializer(serializers.ModelSerializer):
    lookId = OwnLookField(source='look', required=False, allow_null=True)
    price = serializers.CharField(max_length=40, required=False, allow_blank=True, allow_null=True)
    thumbnail = serializers.URLField(max_length=1000, required=False, allow_blank=True, allow_null=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = SavedProduct
        fields = ['id', 'title', 'link', 'price', 'thumbnail', 'source', 'note', 'lookId', 'createdAt']
        # Duplicates are handled in the view (saving twice just returns the saved one)
        validators = []

    def validate_link(self, value):
        if not value.startswith('https://'):
            raise serializers.ValidationError('Only https links can be saved.')
        return value

    def validate(self, data):
        data['price'] = data.get('price') or ''
        data['thumbnail'] = data.get('thumbnail') or ''
        return data
