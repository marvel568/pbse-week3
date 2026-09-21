INSERT INTO rooms (id, room_number, capacity, location, room_status) VALUES
('room_7Kq', 'B204', 6, '2nd Floor', 'available'),
('room_A12', 'B205', 4, '2nd Floor', 'maintenance'),
('room_X91', 'C301', 8, '3rd Floor', 'reserved'),
('room_B77', 'D101', 4, '1st Floor', 'available');

INSERT INTO reservations
    (id, room_id, student_id, status, start_time, end_time, created_at)
VALUES
(
    'res_8Fk2p',
    'room_7Kq',
    's1234567',
    'confirmed',
    '2026-09-10 03:00:00',
    '2026-09-10 05:00:00',
    '2026-09-09 14:30:00'
);

-- UTC format for time and dates assumed