const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: String(i).padStart(2, '0') + ':00',
    power: 0,
    energy: 0,
    count: 0
}));

fetch('http://localhost:8000/api/readings?limit=5000').then(r => r.json()).then(historical => {
    console.log("Total records:", historical.length);
    historical.forEach(r => {
        const d = new Date(r.timestamp);
        const h = d.getHours();
        hours[h].power += r.active_power;
        hours[h].energy += r.cumulative_energy;
        hours[h].count += 1;
    });

    const res = hours.map(h => ({
        hour: h.hour,
        power: h.count > 0 ? +(h.power / h.count).toFixed(2) : 0,
        energy: h.count > 0 ? +(h.energy / h.count).toFixed(2) : 0,
    }));
    console.log(res);
});
