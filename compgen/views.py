from django.template import RequestContext
from django.http import HttpResponseRedirect, HttpResponse

from django.shortcuts import render_to_response
from django.shortcuts import render

from django.conf import settings
from django.core.urlresolvers import reverse
from django.core.exceptions import ObjectDoesNotExist
from django.utils.encoding import smart_str

from django.db.models import Q, Max
from django.db import connection
import os
from Bio import SeqIO
import urllib
import sqlite3
from  compgen.models import *
import json
import cPickle

def staticPage(request, template):
    return render(request, template)


def main(request, template):
    orgs = organismStats.objects.select_related().order_by('org__name')
    return render_to_response(template, dict(orgs = orgs), context_instance =  RequestContext(request) )

def downloadFile(request, orgid, fname):
    files = settings.DOWNLOAD_FILES
    org = organism.objects.get(pk = orgid)
    if fname != 'zp':
        pth = os.path.join(settings.RESULTSPATH, org.name, files[fname])
        name = "%s_-_%s"%(org.name, files[fname])
    else:
        pth = os.path.join(settings.RESULTSPATH, org.name, files[fname]%(org.name))
        name = files[fname]%(org.name)
    fsize = os.stat(pth).st_size
    return sendFile(request, pth, fsize, name)    


def downloadpage(request, template, orgid):
    output = []
    files = settings.DOWNLOAD_FILES
    org = organism.objects.get(pk = orgid)
    for fname in settings.LIST_ORDER:
        if fname != 'zp':
            pth = os.path.join(settings.RESULTSPATH, org.name, files[fname])
            name = files[fname]
        else:
            pth = os.path.join(settings.RESULTSPATH, org.name, files[fname]%(org.name))
            name = "[ALL] %s"%(files[fname]%(org.name))
        fsize = os.stat(pth).st_size
        output.append(dict(name = name, size = "%0.2f"%(fsize / 1024.0 / 1024.0), tag = fname))
    return render_to_response(template, dict(output = output, id = orgid), context_instance =  RequestContext(request) )    


def summarize(request, popA, popB, template):
    pa = organism.objects.get(name = popA)
    pb = organism.objects.get(name = popB)
    try:
        orgpairid = organism_pair.objects.get( Q(orgA = pa) & Q(orgB = pb)) 
        pai = pa.id
        pbi = pb.id
    except:
        orgpairid = organism_pair.objects.get( Q(orgB = pa) & Q(orgA = pb))  
        pai = pb.id
        pbi = pa.id
    return render_to_response(template, dict(popA = pai, popB = pbi, orgpairid = orgpairid.id), context_instance =  RequestContext(request) )


def ajaxSummary(request, popA, popB):
    orgpairid = organism_pair.objects.get( Q(orgA__id = popA) & Q(orgB__id = popB)) 
    entries = group.objects.filter(Q(orgpair = orgpairid ))
    #entries = summary.objects.filter(Q(orgA = popA) & Q(orgB = popB))   
    jsstr= json.dumps( dict(data = [ (str(r.orggroup), str(r.score), str(r.avgboot), '<a href = "' + reverse('GOdetails', kwargs=dict(popA=popA, popB=popB, idx=r.orggroup) )  + '">Details</a>', '<a href = "' +  reverse('dlMSA', kwargs=dict(popA=popA, popB=popB, idx=r.orggroup) ) + '">Download</a>') for r in entries ]) )
    return HttpResponse(jsstr, content_type = "application/json")


def getMSA(popA, popB, idx):
    pa = organism.objects.get(id = popA)
    pb = organism.objects.get(id = popB)
    pA = os.path.join(settings.MSA, "_".join([pa.name, pb.name]))
    pB = os.path.join(settings.MSA, "_".join([pb.name, pa.name]))
    msa = "%s.msa"%(idx)
    state = True
    pth = ""
    if os.path.exists(pA):
        pth = os.path.join(pA, msa)
    elif os.path.exists(pB):
        pth = os.path.join(pB, msa)
    else:
        state = False
        pass
    if not os.path.exists(pth):
        state = False
        pass
    return (state, pth)


def ajaxWordCloud(request, popA, popB):
    cached = os.path.join(settings.WORDCLOUDCACHE, "%s_%s.cache"%(popA, popB))
    if not os.path.isfile(cached):
        cursor = connection.cursor()
        cursor.execute("""SELECT d.go_id, d.id, d.description, count(d.id) as 'counts' 
                          FROM hmap_contig as b 
                          JOIN hmap_goslim AS c ON (c.contig_id = b.id) 
                          JOIN hmap_go2name as d ON (d.id = c.go_id_id)
                          WHERE b.org_id = %s OR b.org_id= %s
                          GROUP BY d.id
                          ORDER BY counts DESC;""", [popA, popB])
        tmp = [ [ r[1] , r[2], int(r[3])] for r in cursor.fetchall()]
        total = sum( (c[-1] for c in tmp) )
        with open(cached, "w") as o:
            cloud = [ (c[1], c[2],) for c in tmp ]
            goid = [ (c[1], c[0],) for c in tmp ]
            cPickle.dump([cloud, goid, total], o)
        goid = dict([ (c[1], reverse('ajax_filter', kwargs=dict(popA=popA, popB=popB, uid=c[0])), ) for c in tmp ])
        del tmp
    else:
        with open(cached) as inp:
            tmp = cPickle.load(inp)
            cloud = tmp[0]
            goid = dict([ (c[0], reverse('ajax_filter', kwargs=dict(popA=popA, popB=popB, uid=c[1])), ) for c in tmp[1] ])
            total = int(tmp[2])
            del tmp
    return HttpResponse(json.dumps(dict(total = total, cloud = cloud, goid= goid) ), content_type = "application/json")


def ajaxFilterSummary(request, popA, popB, uid):
    """
    1. uid == go id
    2. use go id to find all contigs that match
    """
    orgpair = organism_pair.objects.get(Q(orgA__id = popA) & Q(orgB__id = popB))
    
    cursor = connection.cursor()
    cursor.execute("""SELECT a.orggroup 
FROM hmap_group AS a 
JOIN hmap_msa AS b on (a.id = b.grp_id) 
JOIN hmap_goslim AS c ON (c.contig_id = b.contig_id) 
WHERE c.go_id_id = %s AND a.orgpair_id = %s""", [int(uid), orgpair.id])
    ag = group.objects.filter(orgpair_id = orgpair).aggregate(Max('orggroup'))
    
    flags = [0] * (int(ag['orggroup__max']) + 1)
    for i in cursor.fetchall():
        flags[int(i[0])] = 1
    return HttpResponse(json.dumps(flags), content_type = "application/json")

def showDetails(request, popA, popB, idx, template):
    state , pth = getMSA(popA, popB, idx)
    if not state:
        pass
    seqs = set([ s.id.strip() for s in SeqIO.parse(pth, "fasta")])
    godata = []
    for s in seqs:
        cs = s.split()[0]
        results = goslim.objects.filter(contig__name = cs)
        if results:
            godata.append(results)
    return render_to_response(template, dict(godata = godata), context_instance =  RequestContext(request) )


def downloadMSA(request, popA, popB, idx):
    state, pth = getMSA(popA, popB, idx)
    if not state:
        pass
    fsize = os.stat(pth).st_size
    return sendFile(request, pth, fsize, "%s.msa"%(idx))


def sendFile(request, fPath, fsize, filename, contentType = "text/plain"):   
    """
    Force the file out via apache instead of django.  Uses the xsendFile mod.
    https://tn123.org/mod_xsendfile/
    https://github.com/nmaier/mod_xsendfile
    """
    response = HttpResponse(mimetype='application/force-download')
    #response['Content-Type'] = contentType
    response['Content-Disposition'] = 'attachment; filename=%s' %(smart_str(filename) ) 
    response['X-Sendfile'] = urllib.quote(fPath)

    #response['Content-Transfer-Encoding'] = "binary"
    response['Expires'] = 0
    response['Accept-Ranges'] = 'bytes'
    response['Cache-Control'] = "private"
    response['Pragma'] = 'private'

    # should allow for resume..
    httprange = request.META.get("HTTP_RANGE", None)
    if(httprange):
        rng = httprange.split("=")
        cnt = rng[-1].split("-")
        response['Content-Length'] = fsize - int(cnt[0])
        response['Content-Range'] = str(httprange) + str(response['Content-Length']) + "/" + str(fsize)
    else:
        response['Content-Length'] = fsize
    return response

