# Generated by Django 5.2.4 on 2025-07-28 19:41

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='groceryitem',
            options={'ordering': ['order', 'added_at']},
        ),
        migrations.AddField(
            model_name='groceryitem',
            name='order',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
