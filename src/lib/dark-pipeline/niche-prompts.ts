/**
 * Niche-specific system prompts for Dark Pipeline script generation.
 * Each niche defines tone, style, CTA approach, and hook patterns.
 */

interface NichePrompt {
  tone: string;
  hookExamples: string;
  developmentStyle: string;
  ctaStyle: string;
  conclusionStyle: string;
}

export const NICHE_PROMPTS: Record<string, NichePrompt> = {
  "Histórias Bíblicas": {
    tone: "Tom ÉPICO e MAJESTOSO. Linguagem solene, narrativa cinematográfica. Como um narrador de documentário bíblico épico — voz grave, pausas dramáticas, descrições visuais grandiosas. Usa linguagem bíblica modernizada, evocando imagens de desertos, templos, céus abertos, luz divina.",
    hookExamples: `"O que aconteceu naquela noite mudou o destino da humanidade para sempre...", "Existe uma passagem na Bíblia que poucos compreendem de verdade...", "Deus deixou um aviso que foi ignorado por séculos..."`,
    developmentStyle: "Narração imersiva com descrições visuais cinematográficas de cenários bíblicos. Ritmo solene com momentos de tensão dramática. Linguagem que evoca fé, mistério divino e revelação espiritual. Descreve cenários como se fosse um filme épico: desertos vastos, templos iluminados por tochas, céus tempestuosos, figuras silhuetadas contra o pôr do sol.",
    ctaStyle: `CTAs em forma de missão espiritual e bênção:
"Eu quero que você compartilhe esse vídeo com 7 pessoas que precisam dessa palavra. Cada uma delas será abençoada, e em nome de Jesus, essas bênçãos retornarão em dobro para sua vida."
"Se essa palavra tocou seu coração, se inscreva nesse canal. Deus tem uma mensagem nova para você todos os dias."
"Deixe nos comentários 'eu recebo' para que essa oração se manifeste na sua vida."`,
    conclusionStyle: "Encerramento com tom de bênção e proteção divina. Frase final que soa como uma profecia ou promessa espiritual. O espectador deve sentir que recebeu algo sagrado.",
  },

  "Motivacional": {
    tone: "Tom INSPIRADOR e DIRECTO. Frases curtas e de impacto. Como um coach de elite a falar directamente para uma pessoa. Energia crescente ao longo do texto — começa com empatia, cresce para desafio, termina em explosão motivacional.",
    hookExamples: `"Você está a um passo de desistir... e é exatamente por isso que precisa ouvir isso agora.", "Eu vou te contar algo que ninguém teve coragem de te dizer.", "Se você acordou hoje sem vontade de lutar, essa mensagem é para você."`,
    developmentStyle: "Narração directa, emocional, com ritmo de discurso motivacional. Alterna entre empatia ('eu sei que é difícil') e desafio ('mas você vai parar?'). Frases curtas. Pausas dramáticas implícitas. Usa metáforas de guerra, construção, fénix renascendo. Cada parágrafo deve ter uma frase de impacto que funcione sozinha como quote.",
    ctaStyle: `CTAs em forma de compromisso pessoal e comunidade:
"Compartilhe esse vídeo com alguém que está passando por um momento difícil. Às vezes uma mensagem muda tudo."
"Se inscreva e ative o sininho — nosso compromisso é trazer uma palavra de transformação todos os dias."
"Deixe nos comentários: qual é o seu maior objetivo agora? Eu leio todos."`,
    conclusionStyle: "Encerramento explosivo com frase de impacto máximo. Tom de grito de guerra. O espectador deve sentir adrenalina e vontade de agir AGORA.",
  },

  "Curiosidades": {
    tone: "Tom EDUCATIVO e SURPREENDENTE. Ritmo rápido, factos impressionantes, revelações constantes. Como um apresentador de ciência pop que não para de surpreender. Cada frase deve trazer uma informação nova que faz o espectador pensar 'não sabia disso'.",
    hookExamples: `"Você usa isso todos os dias e não faz ideia do que está por trás...", "Existe um facto tão bizarro que a maioria dos cientistas ignora...", "O que eu vou te mostrar agora vai mudar a forma como você vê o mundo."`,
    developmentStyle: "Narração rápida e energética. Cada parágrafo traz um facto novo e surpreendente. Usa números, estatísticas, comparações absurdas para dimensionar ('isso é maior que 10 campos de futebol'). Transições rápidas entre factos. Mantém o espectador num estado constante de 'sério?!'. Linguagem acessível, sem jargão técnico.",
    ctaStyle: `CTAs em forma de curiosidade e comunidade de conhecimento:
"Se você aprendeu algo novo, compartilhe com alguém que precisa saber disso."
"Inscreva-se para não perder as próximas descobertas que vão mudar sua forma de ver o mundo."
"Comenta qual facto te surpreendeu mais — eu aposto que foi o terceiro."`,
    conclusionStyle: "Encerramento com o facto mais surpreendente guardado para o final. Frase que deixa o espectador a pensar. Tom de 'e isso é só o começo'.",
  },

  "Histórias Reais": {
    tone: "Tom DOCUMENTAL e DRAMÁTICO. Narrativa factual com tensão crescente. Como um documentário true crime ou história real — detalhes específicos (datas, nomes, lugares), suspense gradual, revelações calculadas. O espectador deve sentir que está a descobrir algo real e perturbador.",
    hookExamples: `"No dia 14 de março de 1997, algo aconteceu que nunca foi explicado...", "Esta é a história real de uma pessoa que ninguém acreditou... até ser tarde demais.", "O que vou te contar realmente aconteceu. E a parte mais assustadora? Ninguém foi punido."`,
    developmentStyle: "Narração factual com tensão narrativa crescente. Detalhes concretos: datas, locais, nomes. Construção de suspense com revelações graduais. Tom de investigação — 'mas o que ninguém sabia era que...'. Ritmo que alterna entre calma factual e momentos de choque. Descreve ambientes com detalhes sensoriais.",
    ctaStyle: `CTAs em forma de pacto com o espectador:
"Se você está acompanhando até aqui, deixe seu like — isso me ajuda a trazer mais histórias como essa."
"Compartilhe com alguém que gosta de histórias reais — mas cuidado, depois de saber isso, não dá para voltar atrás."
"Nos comentários, me diz: você acredita que isso realmente aconteceu?"`,
    conclusionStyle: "Encerramento com a revelação final ou consequência. Tom de 'e até hoje ninguém sabe a verdade completa'. Frase que deixa o espectador perturbado e querendo mais.",
  },

  "Corpo Humano": {
    tone: "Tom CIENTÍFICO e VISUAL. Explicativo com analogias claras e surpreendentes. Como um professor de anatomia fascinante — transforma processos biológicos complexos em imagens mentais vívidas. Cada explicação deve fazer o espectador olhar para o próprio corpo de forma diferente.",
    hookExamples: `"Agora mesmo, enquanto você assiste esse vídeo, seu corpo está fazendo algo incrível sem você perceber...", "Existe um órgão no seu corpo que pode regenerar 75% de si mesmo. Aposto que você não sabe qual é.", "O que acontece dentro de você nos próximos 60 segundos vai te chocar."`,
    developmentStyle: "Narração científica mas acessível. Usa analogias do quotidiano para explicar processos complexos ('seu coração bombeia sangue suficiente para encher uma piscina olímpica por ano'). Descrições visuais de processos internos como se fosse uma viagem microscópica dentro do corpo. Números que impressionam. Tom de fascínio e respeito pelo corpo humano.",
    ctaStyle: `CTAs em forma de saúde e autocuidado:
"Se você quer entender melhor como seu corpo funciona, se inscreva — toda semana tem uma nova descoberta."
"Compartilhe com alguém que precisa cuidar melhor da saúde. Conhecimento é o primeiro passo."
"Comenta: qual parte do corpo humano te fascina mais? O próximo vídeo pode ser sobre isso."`,
    conclusionStyle: "Encerramento com facto final surpreendente sobre o corpo. Tom de admiração pela máquina humana. Frase que faz o espectador valorizar o próprio corpo.",
  },
};

/**
 * Returns the niche-specific script generation prompt, or null if niche not found.
 */
export function getNicheScriptPrompt(
  niche: string,
  title: string,
  theme: string,
  wordCount: number,
): string | null {
  const np = NICHE_PROMPTS[niche];
  if (!np) return null;

  return `Escreve um roteiro completo para vídeo com o título: "${title}".
Tema original: "${theme}"
Nicho: ${niche}

TOM E ESTILO OBRIGATÓRIO:
${np.tone}

REGRAS DE ESTRUTURA:
- Exatamente ${wordCount} palavras (pode variar ±10%)
- Em Português do Brasil
- Apenas o texto de narração puro — SEM indicações de cena, SEM timestamps, SEM [corte], SEM (pausa)

ESTRUTURA OBRIGATÓRIA DO ROTEIRO:

1. HOOK (primeiros 5-8 segundos / ~30 palavras):
   Frase de abertura que PRENDE imediatamente.
   Exemplos para este nicho: ${np.hookExamples}

2. DESENVOLVIMENTO (corpo principal):
   ${np.developmentStyle}

3. CTAs NATIVOS (distribuídos dentro do roteiro — NÃO no final como bloco separado):
   Insere 2-3 CTAs ao longo do roteiro de forma NATURAL, como se fosse parte da narração.
   ${np.ctaStyle}

   REGRA CRÍTICA: Os CTAs NÃO podem parecer genéricos ou robotizados. Devem fluir naturalmente dentro da narração como se fossem parte da história/mensagem.

4. CONCLUSÃO (últimos ~50 palavras):
   ${np.conclusionStyle}

REGRA ABSOLUTA DE OUTPUT:
- Retorna APENAS o texto de narração. NADA MAIS.
- SEM título, SEM cabeçalho, SEM "## Roteiro", SEM "---"
- SEM "Próximos Passos", SEM dicas de produção, SEM sugestões de ferramentas
- SEM menções a Veo3, Sora, ElevenLabs, Gemini, CapCut ou qualquer ferramenta
- SEM prompts de vídeo, SEM exemplos de cena, SEM markdown
- O output deve ser EXCLUSIVAMENTE o texto que será narrado em voz alta, do início ao fim, sem mais nada.`;
}
