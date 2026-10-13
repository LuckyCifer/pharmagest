from rest_framework import serializers
from .models import MouvementStock, Alerte
from apps.medicaments.serializers import MedicamentSerializer


class MouvementStockSerializer(serializers.ModelSerializer):
    medicament_nom = serializers.CharField(source='medicament.nom', read_only=True)
    utilisateur_nom = serializers.CharField(source='utilisateur.get_full_name', read_only=True)
    type_mouvement_display = serializers.CharField(source='get_type_mouvement_display', read_only=True)

    class Meta:
        model = MouvementStock
        fields = [
            'id', 'medicament', 'medicament_nom', 'type_mouvement',
            'type_mouvement_display', 'quantite', 'quantite_avant',
            'quantite_apres', 'motif', 'reference', 'utilisateur',
            'utilisateur_nom', 'date_mouvement'
        ]
        read_only_fields = ['quantite_avant', 'quantite_apres', 'date_mouvement']

    def validate(self, data):
        quantite = data.get('quantite')
        minimum = 0 if data.get('type_mouvement') == 'ajustement' else 1
        if quantite is not None and quantite < minimum:
            raise serializers.ValidationError({'quantite': f"La quantité doit être supérieure ou égale à {minimum}."})
        return data


class AlerteSerializer(serializers.ModelSerializer):
    medicament_nom = serializers.CharField(source='medicament.nom', read_only=True)
    type_alerte_display = serializers.CharField(source='get_type_alerte_display', read_only=True)
    quantite_stock = serializers.IntegerField(source='medicament.quantite_stock', read_only=True)
    seuil_alerte = serializers.IntegerField(source='medicament.seuil_alerte', read_only=True)
    date_peremption = serializers.DateField(source='medicament.date_peremption', read_only=True)

    class Meta:
        model = Alerte
        fields = '__all__'
