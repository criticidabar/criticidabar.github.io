---
layout: default
title: "Gli episodi — Critici da Bar"
description: "Tutte le puntate trascritte di Critici da Bar: cinema, anime e pop culture, discussi al bancone."
permalink: /episodi/
---

<article class="episodio">
  <p class="eyebrow">Dal bancone</p>
  <h1 class="ep-title">Gli episodi</h1>

  <div class="ep-body">
    <p>Le puntate trascritte, da leggere o da guardare. Le più recenti in cima.</p>
    {% assign lista = site.episodi | sort: 'date' | reverse %}
    {% for ep in lista %}
    <h2><a href="{{ ep.url | relative_url }}">{{ ep.title }}</a></h2>
    <p>{{ ep.description }}</p>
    {% endfor %}
  </div>
</article>
