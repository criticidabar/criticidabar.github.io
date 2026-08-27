---
layout: default
title: "Clip dal Bar — Critici da Bar"
description: "Reel, Shorts e clip evergreen di Critici da Bar: cinema, anime e pop culture in formato breve."
permalink: /clip/
---

<article class="episodio">
  <p class="eyebrow">Dal feed</p>
  <h1 class="ep-title">Clip dal Bar</h1>

  <div class="ep-body">
    <p>Reel, Shorts e clip da recuperare quando vuoi. Qui raccogliamo i contenuti brevi che vale la pena ritrovare anche fuori dal feed.</p>

    {% assign lista = site.clips | sort: 'date' | reverse %}
    {% if lista.size > 0 %}
      {% for clip in lista %}
      <h2><a href="{{ clip.url | relative_url }}">{{ clip.title }}</a></h2>
      <p>{{ clip.description }}</p>
      {% endfor %}
    {% else %}
      <p><strong>Le prime clip stanno arrivando.</strong></p>
    {% endif %}
  </div>
</article>
