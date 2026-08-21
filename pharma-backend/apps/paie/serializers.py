from rest_framework import serializers
from .models import FichePaie


class FichePaieSerializer(serializers.ModelSerializer):
    employe_nom = serializers.SerializerMethodField()
    employe_role = serializers.CharField(source='employe.role', read_only=True)
    cree_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = FichePaie
        fields = '__all__'
        read_only_fields = ['montant_net', 'date_creation', 'cree_par']

    def get_employe_nom(self, obj):
        return obj.employe.get_full_name() or obj.employe.username

    def get_cree_par_nom(self, obj):
        if not obj.cree_par:
            return '—'
        return obj.cree_par.get_full_name() or obj.cree_par.username
