from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api_design', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='leetcode_username',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
