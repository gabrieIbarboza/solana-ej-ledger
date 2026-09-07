# Regras de Execução e Modificação de Arquivos
- NUNCA faça suposições durante a codificação se houver ambiguidade de arquitetura ou dependências.
- Se encontrar um cenário não previsto no plano original, interrompa a execução imediatamente.
- Use a ferramenta `ask_user_question` para apresentar opções de escolha antes de modificar o arquivo atual.


# Fluxo de Git

## Branches

- Use o padrão `<type>/<ticket-id>-<short-description>`.
- Use apenas letras minúsculas, números e hífens na descrição.
- Tipos permitidos: `feature`, `bugfix`, `hotfix`, `chore`, `docs` e `refactor`.
- Exemplo: `feature/PROJ-123-user-authentication`.

## Commits

- Siga Conventional Commits v1.0.0: `<type>(<scope>): <short description>`.
- Escreva em inglês, no imperativo, em minúsculas e sem ponto final.
- Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test` e `chore`.
- O escopo deve representar o módulo ou componente alterado, nunca o nome da IA.
- Inclua um corpo opcional quando ele esclarecer o motivo ou o impacto da alteração.

## Coautoria

- Todo commit gerado pelo ChatGPT/Codex deve terminar, separado por uma linha em branco, com:

  ```text
  Co-authored-by: ChatGPT <chatgpt@openai.com>
  ```
