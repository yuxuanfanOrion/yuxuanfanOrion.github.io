---
permalink: /
title: "Home"
layout: home
author_profile: false
description: "Yuxuan FAN (樊宇轩), Ph.D. student at NTU CCDS, Singapore."
---

<h1 class="sr-only">Yuxuan FAN</h1>

<section id="about">
  <h2 class="section-title">About</h2>
  <div class="about-text">
    <p>
      I am a Ph.D. student at the <a href="https://www.ntu.edu.sg/computing" target="_blank" rel="noopener">College of Computing and Data Science</a>,
      <a href="https://www.ntu.edu.sg/" target="_blank" rel="noopener">Nanyang Technological University</a>, Singapore,
      where I am honored to be supervised by <a href="https://jaehong31.github.io/" target="_blank" rel="noopener">Prof. JaeHong Yoon</a>.
    </p>
    <p>
      I received my M.Phil. in Artificial Intelligence from the <a href="https://www.hkust-gz.edu.cn/academics/hubs-and-thrust-areas/information-hub/" target="_blank" rel="noopener">AI Thrust, Information Hub</a>,
      <a href="https://hkust-gz.edu.cn/" target="_blank" rel="noopener">HKUST (Guangzhou)</a> in 2026, supervised by <a href="https://raymondhliu.github.io/" target="_blank" rel="noopener">Prof. Hao LIU</a>,
      and my bachelor's degree from the <a href="https://www.ustb.edu.cn/" target="_blank" rel="noopener">School of Advanced Engineering, USTB</a> in 2024.
      I also studied Economics at the <a href="https://nsd.pku.edu.cn/" target="_blank" rel="noopener">National School of Development, Peking University</a>.
    </p>
    <p>
      I am passionate about contributing to large-scale, impactful open-source projects.
    </p>
  </div>
</section>

<section id="publications">
  <h2 class="section-title">Selected Publications</h2>
  <p class="section-note">* Equal contribution. See also <a href="https://scholar.google.com/citations?user=h8x-wqkAAAAJ&hl=zh-CN" target="_blank" rel="noopener">Google Scholar</a>.</p>
  <div class="pub-scroll-container scroll-container">
    {% for pub in site.data.publications %}
    <div class="pub-item">
      <div class="pub-title">
        {% if pub.paper_url %}<a href="{{ pub.paper_url }}" target="_blank" rel="noopener">{{ pub.title }}</a>{% else %}{{ pub.title }}{% endif %}
      </div>
      <div class="pub-authors">{{ pub.authors }}</div>
      <div class="pub-meta">
        <span class="pub-venue">{{ pub.venue | remove: " (Highlight)" }}</span>
        {% if pub.venue contains "Highlight" %}<span class="badge badge-highlight">Highlight</span>{% endif %}
        {% assign code_link = pub.code_url | default: pub.code %}
        {% if code_link %}<a class="badge badge-link" href="{{ code_link }}" target="_blank" rel="noopener">Code</a>{% endif %}
        {% if pub.project_url %}<a class="badge badge-link" href="{{ pub.project_url }}" target="_blank" rel="noopener">Project</a>{% endif %}
      </div>
    </div>
    {% endfor %}
  </div>
</section>

<section id="news">
  <h2 class="section-title">News</h2>
  <div class="news-scroll-container scroll-container">
    {% for item in site.data.news %}
    <div class="news-item">
      <span class="news-date">{{ item.date }}</span>
      <span class="news-text">{{ item.text }}</span>
    </div>
    {% endfor %}
  </div>
</section>

<section id="experiences">
  <h2 class="section-title">Experiences</h2>

  <div class="timeline-item">
    <div class="timeline-when">
      Apr. 2026 – Jun. 2026
      <img class="timeline-logo" src="/images/icon/wan.png" alt="Tongyi Wanxiang">
    </div>
    <div class="timeline-body">
      <h3>Tongyi Wanxiang, Alibaba Group</h3>
      <div class="timeline-where">Research Intern</div>
      <p>Participated in the pre-training of image generation models for <a href="https://cn.aliyun.com/benefit/scene/wan?from_alibabacloud=" target="_blank" rel="noopener">Wan 3.0</a>.</p>
    </div>
  </div>

  <div class="timeline-item">
    <div class="timeline-when">
      Oct. 2025 – Mar. 2026
      <img class="timeline-logo" src="/images/icon/ant.png" alt="Ant Group">
    </div>
    <div class="timeline-body">
      <h3>Inclusion AI, Ant Group</h3>
      <div class="timeline-where">Research Intern</div>
      <p>Enhancing the visual reasoning ability of the Ming-Flash-Omni model. Participated in the post-training of <a href="https://huggingface.co/inclusionAI/Ming-flash-omni-2.0" target="_blank" rel="noopener">Ming-flash-omni-2.0</a>.</p>
    </div>
  </div>

  <div class="timeline-item">
    <div class="timeline-when">
      Jun. 2025 – Sep. 2025
      <img class="timeline-logo" src="/images/icon/alibaba.png" alt="Alibaba">
    </div>
    <div class="timeline-body">
      <h3>CV Lab, Amap, Alibaba</h3>
      <div class="timeline-where">Research Intern</div>
      <p>Computer vision research.</p>
    </div>
  </div>
</section>

<section id="education">
  <h2 class="section-title">Education</h2>

  <div class="timeline-item">
    <div class="timeline-when">
      Aug. 2026 – 2030 (expected)
      <img class="timeline-logo" src="/images/icon/ntu.png" alt="NTU">
    </div>
    <div class="timeline-body">
      <h3>Ph.D. in Computer Science</h3>
      <div class="timeline-where">Nanyang Technological University, Singapore</div>
      <p>College of Computing and Data Science (CCDS). Advised by <a href="https://jaehong31.github.io/" target="_blank" rel="noopener">Prof. JaeHong Yoon</a>.</p>
    </div>
  </div>

  <div class="timeline-item">
    <div class="timeline-when">
      Sep. 2024 – Jun. 2026
      <img class="timeline-logo" src="/images/icon/hkust.png" alt="HKUST(GZ)">
    </div>
    <div class="timeline-body">
      <h3>M.Phil. in Artificial Intelligence</h3>
      <div class="timeline-where">HKUST(GZ), Guangzhou, China</div>
      <p>AI Thrust, Information Hub.</p>
    </div>
  </div>

  <div class="timeline-item">
    <div class="timeline-when">
      Sep. 2021 – Jun. 2024
      <img class="timeline-logo" src="/images/icon/pku.png" alt="PKU">
    </div>
    <div class="timeline-body">
      <h3>Exchange Student in Economics</h3>
      <div class="timeline-where">Peking University, Beijing, China</div>
      <p>National School of Development.</p>
    </div>
  </div>

  <div class="timeline-item">
    <div class="timeline-when">
      Sep. 2020 – Jun. 2024
      <img class="timeline-logo" src="/images/icon/ustb.png" alt="USTB">
    </div>
    <div class="timeline-body">
      <h3>B.S. in Robotics and Mechanical Engineering</h3>
      <div class="timeline-where">USTB, Beijing, China</div>
      <p>School of Advanced Engineering.</p>
    </div>
  </div>
</section>

<section id="services">
  <h2 class="section-title">Professional Services</h2>
  <div class="services-grid">
    <div class="services-card">
      <h3>Conference Reviewer</h3>
      <ul class="services-list">
        <li>CVPR</li>
        <li>AAAI</li>
        <li>KDD</li>
        <li>IV</li>
        <li>ITSC</li>
        <li>ICIP</li>
      </ul>
    </div>
    <div class="services-card">
      <h3>Journal Reviewer</h3>
      <ul class="services-list">
        <li>International Journal of Computer Vision (IJCV)</li>
        <li>ACM Transactions on Intelligent Systems and Technology (TIST)</li>
        <li>Knowledge-Based Systems (KBS)</li>
        <li>IEEE Journal of Biomedical and Health Informatics (JBHI)</li>
      </ul>
    </div>
  </div>
</section>

<section id="hobbies">
  <h2 class="section-title">Hobbies</h2>
  <div class="hobbies-text">
    <p>I believe the meaning of life lies in experiencing a wealth of things, and in always being on the journey.</p>
    <p>I am a big fan of <strong>Chelsea</strong> and the <strong>Oklahoma City Thunder</strong>.</p>
    <p>I am a starry sky and astronomy enthusiast, and I love looking up at the stars at night. I am also really into science fiction.</p>
    <p>My favorite novels are <em>The Three-Body Problem</em> and <em>And Quiet Flows the Don</em>.</p>
  </div>
</section>
