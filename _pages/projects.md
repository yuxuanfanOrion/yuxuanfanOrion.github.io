---
permalink: /projects/
title: "Projects"
layout: subpage
author_profile: false
description: "Foundation models and projects Yuxuan FAN has worked on."
lede: "Foundation models and projects I have worked on."
---

<div class="project-list">
  {% for project in site.data.projects %}
  {% assign sky = site.data.nebulae | where: "id", project.sky | first %}
  <article class="project-feature">
    <figure class="project-visual">
      {% if project.image %}
      <img class="project-image" src="{{ project.image }}" alt="{{ project.name }}" loading="lazy" decoding="async">
      {% else %}
      <div class="project-sky" style="--sky:url('{{ sky.src }}');--sky-y:{{ sky.hero[1] }}%">
        {% if project.logo %}<div class="project-chip"><img src="{{ project.logo }}" alt="{{ project.name }} logo" loading="lazy" decoding="async"></div>{% endif %}
      </div>
      {% if sky %}
      <figcaption class="nebula-caption">
        <span>{{ sky.title }}</span>
        <a href="{{ sky.url }}" title="{{ sky.credit }}" target="_blank" rel="noopener">JWST / NASA, ESA, CSA, STScI</a>
      </figcaption>
      {% endif %}
      {% endif %}
    </figure>
    <div class="project-body">
      <div class="project-kind">{{ project.kind }}</div>
      <h2>{{ project.name }}</h2>
      <div class="project-org">{{ project.org }}{% if project.period %}<span class="project-period">{{ project.period }}</span>{% endif %}</div>
      <p>{{ project.text }}</p>
      {% if project.links %}
      <div class="project-links">
        {% for link in project.links %}<a class="badge badge-link" href="{{ link.url }}" target="_blank" rel="noopener">{{ link.label }}</a>{% endfor %}
      </div>
      {% endif %}
    </div>
  </article>
  {% endfor %}
</div>
