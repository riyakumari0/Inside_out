from django.urls import path

from . import admin_views, views

urlpatterns = [
    path('auth/csrf/', views.CsrfView.as_view()),
    path('auth/me/', views.MeView.as_view()),
    path('auth/signup/', views.SignUpView.as_view()),
    path('auth/login/', views.LoginView.as_view()),
    path('auth/logout/', views.LogoutView.as_view()),
    path('auth/profile/', views.ProfileView.as_view()),
    path('auth/change-password/', views.ChangePasswordView.as_view()),
    path('auth/avatar/', views.AvatarView.as_view()),
    path('auth/delete-account/', views.DeleteAccountView.as_view()),
    path('auth/password-reset/', views.PasswordResetRequestView.as_view()),
    path('auth/password-reset/confirm/', views.PasswordResetConfirmView.as_view()),
    path('contact/', views.ContactView.as_view()),
    path('support/', views.SupportView.as_view()),
    path('health/', views.HealthView.as_view()),
    path('admin-panel/stats/', admin_views.StatsView.as_view()),
    path('admin-panel/users/', admin_views.UserListView.as_view()),
    path('admin-panel/users/<int:pk>/', admin_views.UserDetailView.as_view()),
    path('admin-panel/messages/', admin_views.MessageListView.as_view()),
    path('admin-panel/messages/<int:pk>/', admin_views.MessageDetailView.as_view()),
]
