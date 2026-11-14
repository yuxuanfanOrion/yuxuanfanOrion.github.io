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
    <div class="project-top">
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
        {% if project.tagline %}<p class="project-tagline">{{ project.tagline }}</p>{% endif %}
        {% if project.summary %}<p class="project-summary">{{ project.summary }}</p>{% endif %}
        <div class="project-org">{{ project.org }}{% if project.period %}<span class="project-period">{{ project.period }}</span>{% endif %}</div>
        {% if project.links %}
        <div class="project-links">
          {% for link in project.links %}<a class="badge badge-link" href="{{ link.url }}" target="_blank" rel="noopener">{{ link.label }}</a>{% endfor %}
        </div>
        {% endif %}
      </div>
    </div>

    {% if project.stats %}
    <dl class="project-stats">
      {% for stat in project.stats %}
      <div class="project-stat">
        <dt>{{ stat.label }}</dt>
        <dd>{{ stat.value }}</dd>
      </div>
      {% endfor %}
    </dl>
    {% endif %}

    {% if project.highlights %}
    <div class="project-highlights">
      {% for item in project.highlights %}
      <div class="project-highlight">
        <h3>{{ item.title }}</h3>
        <p>{{ item.text }}</p>
      </div>
      {% endfor %}
    </div>
    {% endif %}

    {% if project.figure %}
    <figure class="project-figure">
      <img src="{{ project.figure.src }}" alt="{{ project.figure.alt }}" loading="lazy" decoding="async">
      <figcaption>
        {{ project.figure.caption }}
        {% if project.figure.credit %}<a href="{{ project.figure.url }}" target="_blank" rel="noopener">{{ project.figure.credit }}</a>.{% endif %}
      </figcaption>
    </figure>
    {% endif %}

    {% if project.role %}
    <div class="project-role">
      <h3>My part</h3>
      <p>{{ project.role }}</p>
    </div>
    {% endif %}

    {% if project.source %}
    <p class="project-source">Model facts from the <a href="{{ project.source.url }}" target="_blank" rel="noopener">{{ project.source.label }}</a>.</p>
    {% endif %}
  </article>
  {% endfor %}
</div>
