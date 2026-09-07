CREATE TABLE rooms (
    id VARCHAR(64) PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL UNIQUE,
    capacity INT NOT NULL,
    location VARCHAR(100) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE reservations (
    id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(64) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reservation_room
        FOREIGN KEY (room_id) REFERENCES rooms(id),
    CONSTRAINT chk_reservation_time
        CHECK (end_time > start_time),
    CONSTRAINT chk_reservation_status
        CHECK (status IN ('confirmed', 'active', 'completed', 'cancelled', 'no_show'))
);

CREATE INDEX idx_reservations_room_time
    ON reservations(room_id, start_time, end_time);

CREATE INDEX idx_reservations_student
    ON reservations(student_id);
