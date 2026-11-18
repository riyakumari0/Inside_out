from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import Item, Look, SavedProduct
from .outfit_images import queue_cutout, refresh_collage
from .serializers import ItemSerializer, LookSerializer, SavedProductSerializer


class OwnedViewSet(viewsets.ModelViewSet):
    """Every query is scoped to request.user, so nobody can read or edit another person's closet."""

    def get_queryset(self):
        return self.queryset.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ItemViewSet(OwnedViewSet):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def perform_create(self, serializer):
        item = serializer.save(owner=self.request.user)
        if item.image:
            queue_cutout(item)

    def perform_update(self, serializer):
        photo_changed = 'image' in serializer.validated_data or serializer.validated_data.get('removeImage')
        was_using_cutout = Item.objects.filter(pk=serializer.instance.pk).values_list('use_cutout', flat=True).first()
        cutout_switched = serializer.validated_data.get('use_cutout', was_using_cutout) != was_using_cutout
        item = serializer.save()
        if photo_changed:
            # The old cut-out shows the old photo: drop it now, make the new one in the background
            if item.cutout:
                item.cutout.delete(save=False)
            item.cutout_ai = False
            item.save(update_fields=['cutout', 'cutout_ai'])
            queue_cutout(item)
        if photo_changed or cutout_switched:
            for look in item.looks.all():
                refresh_collage(look)

    def perform_destroy(self, instance):
        instance.image.delete(save=False)
        instance.cutout.delete(save=False)
        looks = list(instance.looks.all())
        instance.delete()
        for look in looks:
            if look.items.exists():
                refresh_collage(look)
            else:
                # Looks that end up empty are removed with the piece
                look.image.delete(save=False)
                look.collage.delete(save=False)
                look.delete()

    @action(detail=False, methods=['post'], url_path='mark-worn')
    def mark_worn(self, request):
        ids = request.data.get('ids')
        if not isinstance(ids, list) or not ids:
            raise serializers.ValidationError({'ids': 'Send a non-empty list of item ids.'})
        items = list(self.get_queryset().filter(id__in=ids))
        now = timezone.now()
        for item in items:
            item.worn_count += 1
            item.last_worn = now
        Item.objects.bulk_update(items, ['worn_count', 'last_worn'])
        return Response(ItemSerializer(items, many=True).data, status=status.HTTP_200_OK)


class LookViewSet(OwnedViewSet):
    queryset = Look.objects.prefetch_related('items')
    serializer_class = LookSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']

    def perform_create(self, serializer):
        refresh_collage(serializer.save(owner=self.request.user))

    def perform_update(self, serializer):
        look = serializer.save()
        if 'items' in serializer.validated_data:
            refresh_collage(look)

    def perform_destroy(self, instance):
        instance.image.delete(save=False)
        instance.collage.delete(save=False)
        instance.delete()


class BagViewSet(OwnedViewSet):
    queryset = SavedProduct.objects.all()
    serializer_class = SavedProductSerializer
    http_method_names = ['get', 'post', 'delete']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product, created = SavedProduct.objects.get_or_create(
            owner=request.user,
            link=serializer.validated_data['link'],
            defaults={k: v for k, v in serializer.validated_data.items() if k != 'link'},
        )
        return Response(self.get_serializer(product).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
