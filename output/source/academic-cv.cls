\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{academic-cv}[2026/10/09 Compact academic CV]

\LoadClass[10pt,a4paper]{article}

\RequirePackage{fontspec}
\RequirePackage{xcolor}
\RequirePackage[a4paper,left=10.5mm,right=10.5mm,top=10.5mm,bottom=15mm,footskip=8mm]{geometry}
\RequirePackage{array}
\RequirePackage{tabularx}
\RequirePackage{enumitem}
\RequirePackage{needspace}
\RequirePackage{fancyhdr}
\RequirePackage{hyperref}

% Normal-width sans serif, distributed with TeX Live and Overleaf.
\setmainfont{lmsans10-regular.otf}[
  BoldFont=lmsans10-bold.otf,
  ItalicFont=lmsans10-oblique.otf,
  BoldItalicFont=lmsans10-boldoblique.otf]
\newfontfamily\cvnamefont{lmsans10-regular.otf}

\definecolor{cvink}{HTML}{292929}
\definecolor{cvmuted}{HTML}{777777}
\definecolor{cvblue}{HTML}{225A8A}
\definecolor{cvsummaryblue}{HTML}{4E6D88}
\definecolor{cvaccent}{HTML}{994C47}
\color{cvink}
\hypersetup{colorlinks=true,linkcolor=cvblue,urlcolor=cvblue,citecolor=cvblue}

\AtBeginDocument{\fontsize{10pt}{11.5pt}\selectfont}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}
\setlist[itemize]{leftmargin=1.25em,label=\textbullet,topsep=1pt,partopsep=0pt,parsep=0pt,itemsep=0.5pt}

\makeatletter
\newcommand*\cv@footername{}
\newcommand{\cvname}[1]{%
  \gdef\cv@footername{#1}%
  \par\noindent\begin{center}%
    {\cvnamefont\fontsize{25pt}{27pt}\selectfont #1\par}%
  \end{center}\vspace{-7pt}%
}
\newcommand{\cvcontact}[1]{%
  \par\noindent\begin{center}%
    {\fontsize{8.5pt}{10.5pt}\selectfont #1\par}%
  \end{center}\vspace{-5pt}%
}

\newcommand{\cvsection}[1]{%
  \par\Needspace{3\baselineskip}\addvspace{7pt}%
  \noindent{\fontsize{16pt}{18pt}\selectfont\bfseries\color{black}#1}%
  \hspace{0.75em}%
  \leaders\hbox{\raisebox{0.7ex}{\rule{1pt}{0.35pt}}}\hfill\null\par
  \nobreak\vspace{3pt}%
}

\newcommand{\cventry}[2]{%
  \par\addvspace{3pt}\noindent
  \begin{tabularx}{\linewidth}{@{}>{\bfseries\raggedright\arraybackslash}X >{\color{cvmuted}\itshape}r@{}}
    #1 & #2
  \end{tabularx}\par\nobreak
}
\newcommand{\cvdetail}[1]{\par\noindent #1\par}

% Education uses a clear school/detail hierarchy without changing other entries.
\newcommand{\cveducationentry}[2]{%
  \par\addvspace{4pt}\noindent
  \begin{tabularx}{\linewidth}{@{}>{\fontsize{10.2pt}{12.2pt}\selectfont\bfseries\raggedright\arraybackslash}X >{\fontsize{9.2pt}{11pt}\selectfont\color{cvmuted}\itshape}r@{}}
    #1 & #2
  \end{tabularx}\par\nobreak
}
\newcommand{\cveducationdetail}[1]{%
  \par\begingroup
    \fontsize{9.3pt}{11pt}\selectfont
    \leftskip=1.2em\rightskip=0pt plus 1fil\noindent #1\par
  \endgroup
}
\newcommand{\cveducationlabel}[1]{{\itshape\color{cvmuted}#1}}

\fancyhf{}
\fancyfoot[L]{{\fontsize{7.5pt}{9pt}\selectfont\color{cvmuted}\cv@footername}}
\fancyfoot[R]{{\fontsize{7.5pt}{9pt}\selectfont\color{cvmuted}\thepage}}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}
\pagestyle{fancy}
\makeatother
