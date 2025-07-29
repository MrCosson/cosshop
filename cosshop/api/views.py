from rest_framework import generics, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import GroceryItem, GroceryHistory
from .serializers import GroceryItemSerializer, GroceryHistorySerializer
from django.db.models import Q
from rest_framework.decorators import api_view
from rest_framework import status

class GroceryItemListCreateView(generics.ListCreateAPIView):
    queryset = GroceryItem.objects.all().order_by('order', 'added_at')
    serializer_class = GroceryItemSerializer

    def perform_create(self, serializer):
        item = serializer.save()
        # Save in history
        GroceryHistory.objects.update_or_create(name=item.name)

class GroceryHistoryListView(generics.ListAPIView):
    serializer_class = GroceryHistorySerializer

    def get_queryset(self):
        q = self.request.query_params.get('q', '')
        if q:
            return GroceryHistory.objects.filter(name__istartswith=q).order_by('-last_added')[:5]
        return GroceryHistory.objects.none()

class GroceryHistoryListAllView(generics.ListAPIView):
    serializer_class = GroceryHistorySerializer

    def get_queryset(self):
        # Sinon, renvoyer TOUT l’historique pour la vue “historique”
        return GroceryHistory.objects.all().order_by('-last_added')

class GroceryItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = GroceryItem.objects.all()
    serializer_class = GroceryItemSerializer

class GroceryHistoryDeleteView(generics.DestroyAPIView):
    queryset = GroceryHistory.objects.all()
    serializer_class = GroceryHistorySerializer

@api_view(['POST'])
def reorder_items(request):
    """
    Attend : {"ids": [id1, id2, id3, ...]}
    Met à jour le champ 'order' de chaque item.
    """
    ids = request.data.get("ids", [])
    for position, item_id in enumerate(ids):
        GroceryItem.objects.filter(id=item_id).update(order=position)
    return Response({"status": "ok"})
