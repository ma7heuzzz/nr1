# Regras do Jogo Nr1

## Objetivo

O objetivo do Nr1 é acumular a maior pontuação possível, capturando estrategicamente os números no tabuleiro antes do seu oponente.

## Como Jogar

1.  **Início:** O jogo começa com um tabuleiro (que pode ter tamanhos diferentes, como 3x3, 4x4, 5x5, 6x6 ou 8x8) preenchido com números aleatórios. Dois jogadores competem.
2.  **Turnos:** Os jogadores se alternam para escolher uma célula (quadrado com um número) no tabuleiro.
3.  **Primeira Jogada:** Na sua primeira jogada, você pode escolher *qualquer* célula livre no tabuleiro.
4.  **Jogadas Seguintes:** A partir da sua segunda jogada, você só pode escolher uma célula livre que seja **adjacente** (horizontalmente ou verticalmente, não diagonalmente) a uma célula que *você já capturou* anteriormente.
5.  **Células Ocupadas:** Você não pode escolher uma célula que já foi capturada por você ou pelo seu oponente.
6.  **Pontuação:** Ao capturar uma célula, o número nela contido é adicionado à sua pontuação total.

## Fim do Jogo

O jogo termina quando uma das seguintes condições for atendida:

*   **Tabuleiro Cheio:** Todas as células do tabuleiro foram capturadas.
*   **Sem Movimentos Válidos:** Nenhum dos jogadores possui mais movimentos válidos (ou seja, não há células livres adjacentes às suas células já capturadas).

## Situação Especial: Sem Movimentos para um Jogador

*   Se for a vez de um jogador, mas ele não tiver nenhum movimento válido disponível, enquanto o oponente *ainda tem* movimentos válidos, o turno **não** passa para o oponente.
*   Nesse caso, o jogador que ainda tem movimentos válidos continua jogando (capturando células adjacentes às suas) até que ele também não tenha mais movimentos válidos ou o tabuleiro fique cheio. Isso é chamado de "auto-complete".

## Vencedor

O jogador com a maior pontuação ao final do jogo é declarado o vencedor. Em caso de pontuações iguais, o jogo termina em empate.

**Boa sorte e que vença a melhor estratégia!**

