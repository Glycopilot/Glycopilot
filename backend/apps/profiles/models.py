from django.db import models


class Profile(models.Model):
    profil_id = models.AutoField(primary_key=True)
    nom = models.CharField(max_length=100)

    class Meta:
        db_table = "profils"

    def __str__(self):
        return self.nom
