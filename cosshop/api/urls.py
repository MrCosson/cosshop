from django.urls import path
from . import views

urlpatterns = [
    path('items/', views.GroceryItemListCreateView.as_view()),
    path('items/<int:pk>/', views.GroceryItemDetailView.as_view()),
    path('history/', views.GroceryHistoryListView.as_view()),
    path('historyall/', views.GroceryHistoryListAllView.as_view()),
    path('items/reorder/', views.reorder_items),
    path('history/<int:pk>/', views.GroceryHistoryDeleteView.as_view()),
]
