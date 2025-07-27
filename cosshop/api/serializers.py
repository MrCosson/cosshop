from rest_framework import serializers
from .models import GroceryItem, GroceryHistory

class GroceryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroceryItem
        fields = ['id', 'name', 'added_at', 'checked']

class GroceryHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = GroceryHistory
        fields = ['id', 'name', 'last_added']
