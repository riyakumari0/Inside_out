from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import Item, Look, SavedProduct
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

    def perform_destroy(self, instance):
        instance.image.delete(save=False)
        # Looks that would end up empty are removed with the piece
        for look in instance.looks.all():
            if look.items.count() <= 1:
                look.image.delete(save=False)
                look.delete()
        instance.delete()

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

    def perform_destroy(self, instance):
        instance.image.delete(save=False)
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
