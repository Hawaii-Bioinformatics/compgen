from django.conf.urls import patterns, include, url

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = patterns('compgen.views',
                       url(r'^$', 'main', {'template':'index.html'}, name ="toplevel"),

                       url(r'^results/org/(?P<orgid>[0-9]+)/(?P<fname>(blast|faa|zp|blast2go)+)/$', 'downloadFile', name = 'downloadfile'),
                       url(r'^results/org/(?P<orgid>[0-9]+)/$', 'downloadpage', {'template':'org_dl.html'}, name = 'results'),

                       url(r'^multi/$', 'staticPage', {'template':'multi.html'}),

                       url(r'^heatmap/$', 'staticPage', {'template':'heatmap.html'}),
                       url(r'^heatmap/data/$', 'matrixdl', name = 'matrix'),

                       url(r'^summary/(?P<popA>.+)/(?P<popB>.+)/$', 'summarize', {'template': 'summarize.html'}),

                       url(r'^dlmsa/(?P<popA>.+)/(?P<popB>.+)/(?P<idx>[0-9]+)/$', 'downloadMSA', name = 'dlMSA'),
                       url(r'^godetails/(?P<popA>.+)/(?P<popB>.+)/(?P<idx>[0-9]+)/$', 'showDetails',{'template': 'details.html'}, name = 'GOdetails'),
                       url(r'^ajax/summary/(?P<popA>.+)/(?P<popB>.+)/$', 'ajaxSummary', name = 'ajax_summary'),
                       url(r'^ajax/filter/(?P<popA>.+)/(?P<popB>.+)/(?P<uid>[0-9]+)/$', 'ajaxFilterSummary', name = 'ajax_filter'),
                       url(r'^ajax/words/(?P<popA>.+)/(?P<popB>.+)/$', 'ajaxWordCloud', name = 'ajax_wordcloud'),
    # Examples:
    # url(r'^$', 'heatmap.views.home', name='home'),
    # url(r'^heatmap/', include('heatmap.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    # url(r'^admin/', include(admin.site.urls)),
)
