function toRoom(row) {
  return {
    id: row.id,
    roomNumber: row.roomNumber ?? row.room_number,
    capacity: Number(row.capacity),
    location: row.location,
    isAvailable: Boolean(row.isAvailable ?? row.is_available)
  };
}

module.exports = { toRoom };
