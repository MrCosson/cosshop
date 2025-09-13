from django.db import models

class GroceryItem(models.Model):
    name = models.CharField(max_length=255)
    added_at = models.DateTimeField(auto_now_add=True)
    checked = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    list_name = models.CharField(
        max_length=50,
        choices=[("paris", "Paris"), ("saussaye", "Saussaye")],
        default="paris"
    )
    class Meta:
        unique_together = ("name", "list_name")

    def __str__(self):
        return self.name


class GroceryHistory(models.Model):
    name = models.CharField(max_length=255, unique=True)
    last_added = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
