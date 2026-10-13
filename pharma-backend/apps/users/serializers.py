from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Utilisateur


class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ['id', 'username', 'first_name', 'last_name', 'email',
                  'role', 'telephone', 'est_actif', 'date_creation']
        read_only_fields = ['date_creation']


class UtilisateurCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = Utilisateur
        fields = ['username', 'first_name', 'last_name', 'email',
                  'password', 'role', 'telephone']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Utilisateur(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UtilisateurUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6, required=False, allow_blank=True)

    class Meta:
        model = Utilisateur
        fields = ['first_name', 'last_name', 'email', 'role', 'telephone', 'est_actif', 'password']

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UtilisateurSerializer(self.user).data
        return data


class ActiveUserTokenRefreshSerializer(TokenRefreshSerializer):
    """Refuse de renouveler le jeton d'un compte désactivé (simplejwt 5.3 ne le vérifie pas)."""
    def validate(self, attrs):
        try:
            user_id = RefreshToken(attrs['refresh']).payload.get(api_settings.USER_ID_CLAIM)
        except TokenError as e:
            raise InvalidToken(e.args[0])
        if not Utilisateur.objects.filter(pk=user_id, is_active=True).exists():
            raise AuthenticationFailed("Ce compte est désactivé.", code='user_inactive')
        return super().validate(attrs)
