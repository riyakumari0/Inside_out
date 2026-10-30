from rest_framework.routers import DefaultRouter

from .views import BagViewSet, ItemViewSet, LookViewSet

router = DefaultRouter(trailing_slash=True)
router.register('items', ItemViewSet, basename='item')
router.register('looks', LookViewSet, basename='look')
router.register('bag', BagViewSet, basename='bag')

urlpatterns = router.urls
