from django.db import models
from django.contrib import admin

# Create your models here.



# # drop
# class contigs(models.Model):
#     id = models.AutoField(primary_key = True)
#     contig_name = models.TextField(blank = True, unique = True)


# #drop
# # this will give us a organism to contig map, so we can just ask for X and get all IDs back...
# class OrganismToContigs(models.Model):
#     id = models.AutoField(primary_key = True)
#     org_id = models.ForeignKey(organism)
#     contig_id = models.ForeignKey(contigs)

    
class organism(models.Model):
    id = models.AutoField(primary_key = True)
    name = models.TextField(blank = False)

class organismStats(models.Model):
    id = models.AutoField(primary_key = True)
    org = models.ForeignKey(organism)
    protcnt = models.IntegerField()
    annotcnt = models.IntegerField()

class contig(models.Model):
    id = models.AutoField(primary_key = True)
    org = models.ForeignKey(organism)
    name = models.TextField(blank = False)


class go2Name(models.Model):
    id = models.AutoField(primary_key = True)
    go_id = models.TextField(blank = False)
    description = models.TextField(blank = True)

   

class goterm(models.Model):
    id = models.AutoField(primary_key = True)
    contig = models.ForeignKey(contig)
    go_id = models.ForeignKey(go2Name)
    description = models.TextField(blank = True)


class goslim(models.Model):
    id = models.AutoField(primary_key = True)
    contig = models.ForeignKey(contig)
    go_id = models.ForeignKey(go2Name)


class organism_pair(models.Model):
    id = models.AutoField(primary_key = True)
    orgA = models.ForeignKey(organism, related_name ='orgA' )
    orgB = models.ForeignKey(organism, related_name = 'orgB' )


class group(models.Model):
    id = models.AutoField(primary_key = True)
    orgpair = models.ForeignKey(organism_pair)
    orggroup = models.IntegerField()
    score = models.IntegerField()
    avgboot = models.DecimalField(max_digits = 6, decimal_places = 3)


class msa(models.Model):
    id = models.AutoField(primary_key = True)
    grp = models.ForeignKey(group)
    contig = models.ForeignKey(contig)


# class summary(models.Model):
#     id = models.AutoField(primary_key = True)
#     orgA = models.TextField(blank = False)
#     orgB = models.TextField(blank = False)
#     groupid = models.IntegerField()
#     score = models.IntegerField()
#     avgboot = models.DecimalField(max_digits= 6, decimal_places=3)
    

class contigAdmin(admin.ModelAdmin):
    list_display = ('id', 'name' )

class summaryAdmin(admin.ModelAdmin):
    list_display = ('id','orgA','orgB','groupid','score','avgboot')
