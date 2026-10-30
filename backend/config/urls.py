from pathlib import Path

from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import include, path, re_path
from django.views.static import serve


def react_app(request, *args, **kwargs):
    """Any non-API URL gets the built React app, which handles its own routing."""
    index = Path(settings.FRONTEND_DIST) / 'index.html'
    if not index.exists():
        raise Http404('Frontend not built. Run npm run build, or use npm run dev in development.')
    return FileResponse(index.open('rb'), content_type='text/html')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('wardrobe.urls')),
    path('api/', include('stylist.urls')),
    # Uploaded photos. Fine for one server with a persistent disk; move to cloud storage to scale out.
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^(?!api/|admin/|media/|static/).*$', react_app),
]
