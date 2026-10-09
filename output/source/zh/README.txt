樊宇轩 (Yuxuan Fan) 简体中文版 CV

使用 XeLaTeX 编译 resume_zh.tex（Overleaf：Menu > Compiler > XeLaTeX）。
标准命令，在解压出的本目录下直接可用：
  xelatex -interaction=nonstopmode -halt-on-error resume_zh.tex
在本仓库的 output/source/zh 目录下构建时，可先建立输出目录，再指定输出路径：
  mkdir -p ../../build/zh
  xelatex -interaction=nonstopmode -halt-on-error -output-directory=../../build/zh resume_zh.tex
academic-cv.cls 与 publication-layout.tex 需与主文件放在同一目录。

字体：中文使用 TeX Live 自带的 FandolHei-Regular.otf / FandolHei-Bold.otf（xeCJK），
英文保持 Latin Modern Sans。FandolHei 没有斜体，中文斜体为合成倾斜。

内容来源：仅以英文版 resume_faangpath.tex 为事实依据。
25 条论文/报告的顺序、英文标题、作者列表、全部链接、投稿状态与同等贡献标记（*）均与英文版一致。
24 条有简短中文摘要；RCI 没有摘要，保持原状。
FootQuery 为 arXiv 预印本（2026），未标注为审稿中。
会议/期刊/产品名（CVPR、EMNLP、Ming-Flash-Omni-2.0、Wan 3.0 等）及导师等人名保留英文。
当前为 A4 两页。

翻译与校对：初译由 Claude 完成，术语经 DeepSeek V4 Flash 通过 Claude Code 修订，
事实与排版由主 agent 独立核验。
