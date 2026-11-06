-- Optional example: a generic "Solicitações" pipe (phases, move rules, start form, phase fields).
-- Run after 0001_init.sql, only once. Keep your real seeds in supabase/private/ (gitignored).
do $$
declare
  v_pipe uuid;
  p_inbox uuid; p_doing uuid; p_pending uuid; p_paid uuid; p_done uuid;
begin
  insert into pipes(name, icon, color, form_settings) values (
    'Solicitações', 'clipboard', '#0d9488',
    jsonb_build_object('title', 'Nova solicitação', 'success_message', 'Recebemos sua solicitação!')
  ) returning id into v_pipe;

  insert into phases(pipe_id, name, color, position) values (v_pipe, 'Caixa de entrada', '#65a30d', 0) returning id into p_inbox;
  insert into phases(pipe_id, name, color, position) values (v_pipe, 'Em andamento', '#2563eb', 1) returning id into p_doing;
  insert into phases(pipe_id, name, color, position) values (v_pipe, 'Aguardando pagamento', '#7c3aed', 2) returning id into p_pending;
  insert into phases(pipe_id, name, color, position) values (v_pipe, 'Pago', '#4f46e5', 3) returning id into p_paid;
  insert into phases(pipe_id, name, color, position, is_final) values (v_pipe, 'Concluído', '#16a34a', 4, true) returning id into p_done;

  insert into phase_transitions values
    (p_inbox, p_doing),
    (p_doing, p_pending), (p_doing, p_paid), (p_doing, p_done),
    (p_pending, p_paid),
    (p_paid, p_done);

  insert into fields(pipe_id, phase_id, type, label, required, show_on_card, position, options) values
    (v_pipe, null, 'short_text', 'Nome completo', true, true, 0, '[]'),
    (v_pipe, null, 'phone', 'Telefone', false, false, 1, '[]'),
    (v_pipe, null, 'email', 'E-mail', false, false, 2, '[]'),
    (v_pipe, null, 'short_text', 'Número do documento', true, true, 3, '[]'),
    (v_pipe, null, 'date', 'Data desejada', false, true, 4, '[]'),
    (v_pipe, null, 'long_text', 'Observações', false, false, 5, '[]'),
    (v_pipe, null, 'attachment', 'Anexos (opcional)', false, false, 6, '[]'),
    (v_pipe, null, 'radio', 'Como prefere ser contatado?', false, false, 7, '["E-mail","Telefone","Videochamada"]'),
    (v_pipe, null, 'radio', 'Confirmo que as informações são verdadeiras', true, false, 8, '["Sim"]');

  insert into fields(pipe_id, phase_id, type, label, required, position, options) values
    (v_pipe, p_doing, 'long_text', 'Notas internas', false, 0, '[]'),
    (v_pipe, p_doing, 'checklist', 'Forma de pagamento', true, 1, '["Transferência","Cartão","Outro"]'),
    (v_pipe, p_doing, 'currency', 'Valor', false, 2, '[]');
end $$;
