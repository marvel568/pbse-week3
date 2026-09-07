INSERT INTO rooms (id, room_number, capacity, location, is_available) VALUES
('room_7Kq', 'B204', 6, '2nd Floor', TRUE),
('room_A12', 'B205', 4, '2nd Floor', TRUE),
('room_X91', 'C301', 8, '3rd Floor', TRUE);

INSERT INTO reservations
    (id, room_id, student_id, status, start_time, end_time, created_at)
VALUES
(
    'res_8Fk2p',
    'room_7Kq',
    's1234567',
    'confirmed',
    '2026-09-10 10:00:00',
    '2026-09-10 12:00:00',
    '2026-09-09 14:30:00'
);
