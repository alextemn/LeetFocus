from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api_design', '0003_pro_tier'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='stripe_subscription_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
