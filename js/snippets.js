// Decorative code for the background. Markup: ⟦k|text⟧ where the letter is a
// token class: k keyword, f function/type, s string, n number, c comment, p punctuation.
import { escapeHtml } from './util.js';

export const SNIPPETS = [
`⟦k|extends⟧ ⟦f|CharacterBody2D⟧

⟦k|const⟧ SPEED ⟦p|=⟧ ⟦n|240.0⟧

⟦k|func⟧ ⟦f|_physics_process⟧(delta):
    velocity ⟦p|=⟧ input_dir ⟦p|*⟧ SPEED
    ⟦f|move_and_slide⟧()`,

`⟦c|$⟧ ./run_task.sh ⟦s|--turns 3⟧
[1/3] build    ⟦s|✓ pass⟧
[2/3] migrate  ⟦s|✓ pass⟧
[3/3] verify   ⟦n|✗ fail⟧`,

`⟦k|query⟧ ⟦f|Call⟧(⟦n|$id⟧: ID!) {
  call(id: ⟦n|$id⟧) {
    participants { avatar presence }
  }
}`,

`⟦k|suspend fun⟧ ⟦f|syncPresence⟧(state: ⟦f|Avatar⟧) {
    channel.⟦f|send⟧(state.⟦f|toFrame⟧())
}`,

`⟦k|auto⟧ frame ⟦p|=⟧ encoder.⟦f|next⟧();
⟦k|if⟧ (!frame) ⟦k|return⟧;
pipeline.⟦f|push⟧(std::⟦f|move⟧(*frame));`,

`⟦k|const⟧ shell ⟦p|=⟧ ⟦k|new⟧ ⟦f|Terminal⟧({
  prompt: ⟦s|"~ $"⟧,
  theme: ⟦s|"midnight"⟧,
});`,

`⟦k|def⟧ ⟦f|evaluate⟧(task, model):
    result ⟦p|=⟧ model.⟦f|solve⟧(task)
    ⟦k|return⟧ task.⟦f|grade⟧(result)`,

`{
  ⟦s|"task"⟧: ⟦s|"godot-platformer"⟧,
  ⟦s|"turns"⟧: ⟦n|3⟧,
  ⟦s|"status"⟧: ⟦s|"in review"⟧
}`,

`⟦c|$⟧ git commit -m ⟦s|"ship it"⟧
⟦c|[main 7f3a2c1] ship it⟧
 ⟦n|3⟧ files changed, ⟦s|+128⟧ ⟦n|-42⟧`,

`⟦k|export function⟧ ⟦f|Player⟧({ src }) {
  ⟦k|return⟧ <⟦f|Video⟧ src={src} autoPlay />;
}`,

`⟦c|# scene.tscn⟧
[node name=⟦s|"Level"⟧ type=⟦s|"Node2D"⟧]
[node name=⟦s|"Player"⟧ parent=⟦s|"."⟧]`,

`⟦c|$⟧ godot --export-release ⟦s|"Web"⟧ build/
⟦s|✓⟧ exported build/index.html`,
];

export const SYMBOLS = ['{ }', '</>', '$_', '=>', '&&', '::', '#!', '[ ]', '//', 'λ', '>_', '( )', ';', '|>', '!='];

export function renderSnippet(src) {
  return escapeHtml(src).replace(/⟦(\w)\|([^⟧]*)⟧/g, '<span class="$1">$2</span>');
}
