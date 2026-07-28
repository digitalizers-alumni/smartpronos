import {
  Component,
  signal,
  computed,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  circle: 'coach' | 'citizen-dev' | 'product';
  circleLabel: string;
  circleBadgeClass: string;
  initials: string;
  gradientClass: string;
  bio: string;
  tags: string[];
  hasPhoto: boolean;
  photoUrl: string | null;
  hasLinkedin: boolean;
  linkedinUrl: string | null;
  searchKeywords: string;
}

interface PodiumEntry {
  rank: 1 | 2 | 3;
  name: string;
  subtitle: string;
  score: string;
  detail: string;
  badge: string;
  gradientClass: string;
  borderClass: string;
  crownIcon?: string;
}

@Component({
  selector: 'app-closure-page',
  standalone: true,
  templateUrl: './closure-page.html',
  styleUrls: ['./closure-page.scss'],
})
export class ClosurePage implements AfterViewInit, OnDestroy {
  @ViewChild('carouselViewport') carouselViewport!: ElementRef<HTMLDivElement>;

  protected readonly currentCircle = signal<'all' | 'coach' | 'citizen-dev' | 'product'>('all');
  protected readonly searchQuery = signal<string>('');

  private autoScrollInterval: any = null;
  private isPaused = false;

  // Drag-to-scroll mouse state
  private isMouseDown = false;
  private startX = 0;
  private scrollLeftPos = 0;

  // --- PODIUMS DATA (DONNÉES RÉELLES SUPABASE) ---
  protected readonly topPlayers: PodiumEntry[] = [
    {
      rank: 1,
      name: 'Damien Pineau',
      subtitle: 'Champion de la Coupe du Monde',
      score: '209 pts',
      detail: '19 scores exacts',
      badge: '1er Joueur Global',
      gradientClass: 'from-amber-400 to-yellow-600 text-amber-950',
      borderClass: 'border-amber-400/60 shadow-amber-500/20 bg-amber-50/30',
      crownIcon: 'workspace_premium',
    },
    {
      rank: 2,
      name: 'Dav\'eed',
      subtitle: 'Vice-Champion du Tournoi',
      score: '206 pts',
      detail: '18 scores exacts',
      badge: '2e Place Individuelle',
      gradientClass: 'from-slate-300 to-slate-500 text-slate-900',
      borderClass: 'border-slate-300/80 shadow-slate-400/10 bg-slate-50/50',
    },
    {
      rank: 3,
      name: 'Corinne Hügli',
      subtitle: '3e Marches du Podium',
      score: '201 pts',
      detail: '19 scores exacts',
      badge: '3e Place Individuelle',
      gradientClass: 'from-amber-700 to-orange-800 text-amber-100',
      borderClass: 'border-amber-700/40 shadow-amber-800/10 bg-amber-900/5',
    },
  ];

  protected readonly topLargeTribes: PodiumEntry[] = [
    {
      rank: 1,
      name: 'Newrest CH',
      subtitle: 'Grande Tribu Vainqueur',
      score: '148.0 pts',
      detail: '8 membres actifs',
      badge: '1ère Grande Tribu',
      gradientClass: 'from-amber-400 to-yellow-600 text-amber-950',
      borderClass: 'border-amber-400/60 shadow-amber-500/20 bg-amber-50/30',
      crownIcon: 'military_tech',
    },
    {
      rank: 2,
      name: 'FER Neuchâtel',
      subtitle: 'Collectif Neuchâtelois',
      score: '136.7 pts',
      detail: '10 membres actifs',
      badge: '2e Grande Tribu',
      gradientClass: 'from-slate-300 to-slate-500 text-slate-900',
      borderClass: 'border-slate-300/80 shadow-slate-400/10 bg-slate-50/50',
    },
    {
      rank: 3,
      name: 'Digitalizers GE',
      subtitle: 'Collectif Genevois',
      score: '132.5 pts',
      detail: '20 membres actifs',
      badge: '3e Grande Tribu',
      gradientClass: 'from-amber-700 to-orange-800 text-amber-100',
      borderClass: 'border-amber-700/40 shadow-amber-800/10 bg-amber-900/5',
    },
  ];

  protected readonly topSmallTribes: PodiumEntry[] = [
    {
      rank: 1,
      name: 'DZ Admin & Gestion',
      subtitle: 'Petite Tribu Vainqueur',
      score: '93.3 pts',
      detail: '4 membres unis',
      badge: '1ère Petite Tribu',
      gradientClass: 'from-amber-400 to-yellow-600 text-amber-950',
      borderClass: 'border-amber-400/60 shadow-amber-500/20 bg-amber-50/30',
      crownIcon: 'shield',
    },
    {
      rank: 2,
      name: 'Cérésole',
      subtitle: 'Trio Compétiteur',
      score: '49.0 pts',
      detail: '3 membres unis',
      badge: '2e Petite Tribu',
      gradientClass: 'from-slate-300 to-slate-500 text-slate-900',
      borderClass: 'border-slate-300/80 shadow-slate-400/10 bg-slate-50/50',
    },
    {
      rank: 3,
      name: 'Tribu RD Congo',
      subtitle: 'Tribu Partenaire',
      score: '44.0 pts',
      detail: '3 membres unis',
      badge: '3e Petite Tribu',
      gradientClass: 'from-amber-700 to-orange-800 text-amber-100',
      borderClass: 'border-amber-700/40 shadow-amber-800/10 bg-amber-900/5',
    },
  ];

  protected readonly teamMembers: TeamMember[] = [
    {
      id: 'ryen-kamkoum',
      name: 'Ryen Kamkoum',
      role: 'Lead Frontend Developer',
      circle: 'citizen-dev',
      circleLabel: 'Cercle : Citizen Dev',
      circleBadgeClass: 'bg-blue-50 text-[#1D4DFF] border border-blue-200',
      initials: 'RK',
      gradientClass: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      bio: "Mise en place d'une interface visuelle, responsive et connectée au backend.",
      tags: ['Angular 21', 'TypeScript', 'OpenCode'],
      hasPhoto: true,
      photoUrl: 'assets/team/ryen-kamkoum.jpg',
      hasLinkedin: true,
      linkedinUrl: 'https://www.linkedin.com/in/ryen-kamkoum/',
      searchKeywords: 'ryen kamkoum lead frontend developer angular typescript opencode citizen dev',
    },
    {
      id: 'alban-zuka',
      name: 'Alban Zuka',
      role: 'Data & Backend Developer',
      circle: 'citizen-dev',
      circleLabel: 'Cercle : Citizen Dev',
      circleBadgeClass: 'bg-blue-50 text-[#1D4DFF] border border-blue-200',
      initials: 'AZ',
      gradientClass: 'bg-gradient-to-br from-blue-600 to-indigo-700',
      bio: "Je m'occupais de la partie backend, spécifiquement sur les données des matchs.",
      tags: ['Agilité', 'Project Management', 'Dev with No-code'],
      hasPhoto: true,
      photoUrl: 'assets/team/alban-zuka.png',
      hasLinkedin: true,
      linkedinUrl: 'https://www.linkedin.com/in/albanzuka/',
      searchKeywords: 'alban zuka backend developer agilité project management dev with no-code',
    },
    {
      id: 'per-otto-schruefer',
      name: 'Per Otto Schruefer',
      role: 'QA & Test Automation Engineer',
      circle: 'citizen-dev',
      circleLabel: 'Cercle : Citizen Dev',
      circleBadgeClass: 'bg-blue-50 text-[#1D4DFF] border border-blue-200',
      initials: 'PO',
      gradientClass: 'bg-gradient-to-br from-slate-700 to-slate-900',
      bio: "J'ai écrit des tests unitaires pour Cypress et aussi testé à la main.",
      tags: ['Cypress', 'Testing', 'QA'],
      hasPhoto: true,
      photoUrl: 'assets/team/per-otto-schruefer.jpg',
      hasLinkedin: false,
      linkedinUrl: null,
      searchKeywords: 'per otto schruefer tester application cypress testing qa citizen dev',
    },
    {
      id: 'francois-dujourdhui',
      name: 'François Dujourd’hui',
      role: 'UI Designer & Frontend Developer',
      circle: 'citizen-dev',
      circleLabel: 'Cercle : Citizen Dev',
      circleBadgeClass: 'bg-blue-50 text-[#1D4DFF] border border-blue-200',
      initials: 'FD',
      gradientClass: 'bg-gradient-to-br from-purple-600 to-pink-600',
      bio: "Création de maquettes d’écrans, UI Design et respect du cahier des charges du département marketing.",
      tags: ['Coopération', 'Synergie', 'Agilité'],
      hasPhoto: true,
      photoUrl: 'assets/team/francois-dujourdhui.jpg',
      hasLinkedin: true,
      linkedinUrl: 'https://www.linkedin.com/in/francois-fdh/',
      searchKeywords: 'françois dujourdhui frontend developer ui design maquettes coopération synergie agilité',
    },
    {
      id: 'regis-salnave',
      name: 'Régis Salnave',
      role: 'Brand & Marketing Strategist',
      circle: 'product',
      circleLabel: 'Cercle : Product & Marketing',
      circleBadgeClass: 'bg-purple-50 text-purple-700 border border-purple-200',
      initials: 'RS',
      gradientClass: 'bg-gradient-to-br from-rose-500 to-red-600',
      bio: "Positionnement de marque, identité visuelle, stratégie de lancement et optimisation marketing.",
      tags: ['Brand Strategy', 'Content Strategy', 'Marketing Analytics'],
      hasPhoto: true,
      photoUrl: 'assets/team/regis-salnave.png',
      hasLinkedin: true,
      linkedinUrl: 'https://www.linkedin.com/in/r%C3%A9gis-mathieu-salnave/',
      searchKeywords: 'régis salnave brand marketing strategist identité visuelle stratégie lancement content marketing',
    },
    {
      id: 'benoit-depagnier',
      name: 'Benoît d’Epagnier',
      role: 'QA & Database Analyst',
      circle: 'citizen-dev',
      circleLabel: 'Cercle : Citizen Dev',
      circleBadgeClass: 'bg-blue-50 text-[#1D4DFF] border border-blue-200',
      initials: 'BE',
      gradientClass: 'bg-gradient-to-br from-indigo-600 to-sky-700',
      bio: "Principalement tests des scores et classement.",
      tags: ['Teamwork', 'Gestion de projet', 'Promotion'],
      hasPhoto: true,
      photoUrl: 'assets/team/benoit-depagnier.jpg',
      hasLinkedin: true,
      linkedinUrl: 'https://www.linkedin.com/in/bdepagnier/',
      searchKeywords: 'benoît depagnier testeur application db scores classement teamwork gestion de projet promotion',
    },
    {
      id: 'tiago-lourenco',
      name: 'Tiago Lourenço',
      role: 'Directeur Artistique & Branding',
      circle: 'product',
      circleLabel: 'Cercle : Product & Marketing',
      circleBadgeClass: 'bg-purple-50 text-purple-700 border border-purple-200',
      initials: 'TL',
      gradientClass: 'bg-gradient-to-br from-[#00D4FF] to-blue-600',
      bio: "Création de la charte graphique, logo, branding, communication et soutien UX/UI.",
      tags: ['Coopération', 'Communication', 'Innovation'],
      hasPhoto: true,
      photoUrl: 'assets/team/tiago-lourenco.png',
      hasLinkedin: true,
      linkedinUrl: 'https://www.linkedin.com/in/tiago-louren%C3%A7o-711654189/',
      searchKeywords: 'tiago lourenço responsable da branding marketing logo charte graphique communication innovation',
    },
    {
      id: 'rui-da-graca',
      name: 'Rui Da Graça',
      role: 'UI Designer',
      circle: 'citizen-dev',
      circleLabel: 'Cercle : Citizen Dev',
      circleBadgeClass: 'bg-blue-50 text-[#1D4DFF] border border-blue-200',
      initials: 'RD',
      gradientClass: 'bg-gradient-to-br from-teal-500 to-emerald-600',
      bio: "La partie design de l'interface et travail en équipe.",
      tags: ['Design UI', 'Travail en équipe', 'Participatif'],
      hasPhoto: false,
      photoUrl: null,
      hasLinkedin: false,
      linkedinUrl: null,
      searchKeywords: 'rui da graça ui designer participatif design interface travail en équipe',
    },
    {
      id: 'ahmed-bassiouny',
      name: 'Ahmed Bassiouny',
      role: 'Product Owner & Scrum Master',
      circle: 'citizen-dev',
      circleLabel: 'Cercle : Citizen Dev',
      circleBadgeClass: 'bg-blue-50 text-[#1D4DFF] border border-blue-200',
      initials: 'AB',
      gradientClass: 'bg-gradient-to-br from-amber-500 to-orange-600',
      bio: "Gestion du backlog, facilitation du travail et développement low/no-code.",
      tags: ['Product Owner', 'Project Management', 'Stakeholder Management'],
      hasPhoto: true,
      photoUrl: 'assets/team/ahmed-bassiouny.png',
      hasLinkedin: true,
      linkedinUrl: 'https://www.linkedin.com/in/ah-bassiouny',
      searchKeywords: 'ahmed bassiouny product owner scrum master citizen dev backlog management stakeholder',
    },
    {
      id: 'louis-piaget',
      name: 'Louis Piaget',
      role: 'Coach & Product Strategist',
      circle: 'coach',
      circleLabel: 'Coach',
      circleBadgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      initials: 'LP',
      gradientClass: 'bg-gradient-to-br from-violet-600 to-indigo-800',
      bio: "Participer au cadrage du projet, soutien Product Owner et stratégie marketing.",
      tags: ['Cadrage', 'Product Owner', 'Marketing Strategy'],
      hasPhoto: true,
      photoUrl: 'assets/team/louis-piaget.jpg',
      hasLinkedin: true,
      linkedinUrl: 'https://www.linkedin.com/in/louis-piaget/',
      searchKeywords: 'louis piaget coach citizen dev cadrage product owner marketing strategy',
    },
    {
      id: 'valentin-finociety',
      name: 'Valentin Finociety',
      role: 'Coach & Lead Fullstack Developer',
      circle: 'coach',
      circleLabel: 'Coach',
      circleBadgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      initials: 'VF',
      gradientClass: 'bg-gradient-to-br from-cyan-600 to-blue-700',
      bio: "Backup en l'absence de Ryen pour la dernière ligne droite avant communication.",
      tags: ['Coach', 'Dev Fullstack', 'Backup Lead'],
      hasPhoto: true,
      photoUrl: 'assets/team/valentin-finociety.jpg',
      hasLinkedin: true,
      linkedinUrl: 'https://www.linkedin.com/in/valentin-finociety-959b30126/',
      searchKeywords: 'valentin finociety coach dev fullstack backup lead communication',
    },
    {
      id: 'johnathan-gleize',
      name: 'Johnathan Gleize',
      role: 'DevOps & Infrastructure Engineer',
      circle: 'citizen-dev',
      circleLabel: 'Cercle : Citizen Dev',
      circleBadgeClass: 'bg-blue-50 text-[#1D4DFF] border border-blue-200',
      initials: 'JG',
      gradientClass: 'bg-gradient-to-br from-emerald-600 to-teal-800',
      bio: "Mise en place de l'infrastructure, Pipeline CI/CD et GitHub Actions.",
      tags: ['DevOps', 'Git', 'Backend'],
      hasPhoto: true,
      photoUrl: 'assets/team/johnathan-gleize.jpg',
      hasLinkedin: true,
      linkedinUrl: 'https://www.linkedin.com/in/jonathan-gleize/',
      searchKeywords: 'johnathan gleize devops engineer infrastructure pipeline ci cd github actions git backend',
    },
  ];

  protected readonly filteredMembers = computed(() => {
    const circle = this.currentCircle();
    const query = this.searchQuery().trim().toLowerCase();

    return this.teamMembers.filter((member) => {
      const matchesCircle = circle === 'all' || member.circle === circle;
      const matchesSearch =
        !query ||
        member.searchKeywords.toLowerCase().includes(query) ||
        member.name.toLowerCase().includes(query) ||
        member.bio.toLowerCase().includes(query);

      return matchesCircle && matchesSearch;
    });
  });

  ngAfterViewInit(): void {
    this.startAutoScroll();
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
  }

  protected setCircleFilter(circle: 'all' | 'coach' | 'citizen-dev' | 'product'): void {
    this.currentCircle.set(circle);
    if (this.carouselViewport?.nativeElement) {
      this.carouselViewport.nativeElement.scrollLeft = 0;
    }
  }

  protected onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    if (this.carouselViewport?.nativeElement) {
      this.carouselViewport.nativeElement.scrollLeft = 0;
    }
  }

  protected scrollLeft(): void {
    if (this.carouselViewport?.nativeElement) {
      this.carouselViewport.nativeElement.scrollBy({ left: -360, behavior: 'smooth' });
    }
  }

  protected scrollRight(): void {
    if (this.carouselViewport?.nativeElement) {
      this.carouselViewport.nativeElement.scrollBy({ left: 360, behavior: 'smooth' });
    }
  }

  protected pauseAutoScroll(): void {
    this.isPaused = true;
  }

  protected resumeAutoScroll(): void {
    this.isPaused = false;
  }

  // --- DRAG TO SCROLL EVENTS ---
  protected onMouseDown(e: MouseEvent): void {
    this.isMouseDown = true;
    this.pauseAutoScroll();
    if (this.carouselViewport?.nativeElement) {
      this.startX = e.pageX - this.carouselViewport.nativeElement.offsetLeft;
      this.scrollLeftPos = this.carouselViewport.nativeElement.scrollLeft;
    }
  }

  protected onMouseLeave(): void {
    this.isMouseDown = false;
    this.resumeAutoScroll();
  }

  protected onMouseUp(): void {
    this.isMouseDown = false;
  }

  protected onMouseMove(e: MouseEvent): void {
    if (!this.isMouseDown || !this.carouselViewport?.nativeElement) return;
    e.preventDefault();
    const x = e.pageX - this.carouselViewport.nativeElement.offsetLeft;
    const walk = (x - this.startX) * 1.5;
    this.carouselViewport.nativeElement.scrollLeft = this.scrollLeftPos - walk;
  }
  
  private startAutoScroll(): void {
    this.stopAutoScroll();
    this.autoScrollInterval = setInterval(() => {
      if (!this.isPaused && !this.isMouseDown && this.carouselViewport?.nativeElement) {
        const el = this.carouselViewport.nativeElement;
        el.scrollLeft += 1;
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) {
          el.scrollLeft = 0;
        }
      }
    }, 35);
  }

  private stopAutoScroll(): void {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
  }
}
