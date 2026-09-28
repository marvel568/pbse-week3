function toRoom(row) {
  return {
    id: row.id,
    roomNumber: row.roomNumber ?? row.room_number,
    capacity: Number(row.capacity),
    location: row.location,
    room_status: row.room_status ?? row.roomStatus
  };
}

module.exports = { toRoom };
