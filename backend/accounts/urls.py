from django.urls import path

from . import views

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
    path('health/', views.HealthView.as_view()),
]
