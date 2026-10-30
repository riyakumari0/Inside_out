from django.urls import path

from . import views

urlpatterns = [
    path('stylist/analyze/', views.AnalyzeView.as_view()),
    path('stylist/outfit/', views.OutfitView.as_view()),
    path('stylist/evaluate/', views.EvaluateView.as_view()),
    path('stylist/shop/', views.ShopView.as_view()),
    path('stylist/image/', views.OutfitImageView.as_view()),
    path('stylist/chat/', views.ChatView.as_view()),
]
