const fs = require('fs').promises;
const path = require('path');

async function calculatePlaytime(logDirectory) {
  try {
    // Read all files in the directory
    const files = await fs.readdir(logDirectory);

    // Filter for log files
    const logFiles = files.filter(file => file.endsWith('.log') || file.endsWith('.txt'));

    let totalPlaytimeMs = 0;
    const sessions = [];

    for (const file of logFiles) {
      const filePath = path.join(logDirectory, file);

      // Get file stats for last modified time (close time)
      const stats = await fs.stat(filePath);
      const closeTime = stats.mtime;

      // Read file content to get the open timestamp
      const content = await fs.readFile(filePath, 'utf8');

      // Extract ISO 8601 timestamp from log file
      // Looking for pattern like: [2025-05-21T19:31:22.421-05:00]
      const timestampMatch = content.match(/\[(\d{4}-\d{2}-\d{2}T[^\]]+)\]/);

      if (timestampMatch) {
        const openTimeString = timestampMatch[1];
        const openTime = new Date(openTimeString);

        // Validate that we got a valid date
        if (!isNaN(openTime.getTime())) {
          const sessionDuration = closeTime - openTime;

          // Filter out sessions longer than 24 hours (likely errors)
          if (sessionDuration > 0 && sessionDuration < 24 * 60 * 60 * 1000) {
            totalPlaytimeMs += sessionDuration;
            sessions.push({
              file: file,
              opened: openTime.toLocaleString(),
              closed: closeTime.toLocaleString(),
              duration: formatDuration(sessionDuration)
            });
          } else {
            console.log(`⚠️  Skipping ${file}: Invalid duration (${formatDuration(Math.abs(sessionDuration))})`);
          }
        } else {
          console.log(`⚠️  Skipping ${file}: Could not parse timestamp "${openTimeString}"`);
        }
      } else {
        console.log(`⚠️  Skipping ${file}: No timestamp found`);
      }
    }

    // Sort sessions by open time
    sessions.sort((a, b) => new Date(a.opened) - new Date(b.opened));

    // Display results
    console.log('\n=== Clone Hero Playtime Calculator ===\n');
    console.log(`Total sessions: ${sessions.length}`);
    console.log(`Total playtime: ${formatDuration(totalPlaytimeMs)}\n`);

    // Show individual sessions (limit to last 20 for readability)
    if (sessions.length > 0) {
      console.log('Recent Session Details (last 20):');
      const recentSessions = sessions.slice(-20);
      recentSessions.forEach((session, index) => {
        console.log(`${sessions.length - 20 + index + 1}. ${session.duration} (${session.opened} - ${session.closed})`);
      });

      if (sessions.length > 20) {
        console.log(`\n... and ${sessions.length - 20} more sessions`);
      }
    }

    // Summary statistics
    console.log('\n=== Summary ===');
    console.log(`Total hours: ${(totalPlaytimeMs / (1000 * 60 * 60)).toFixed(2)}`);
    console.log(`Total days: ${(totalPlaytimeMs / (1000 * 60 * 60 * 24)).toFixed(2)}`);

    if (sessions.length > 0) {
      const avgSessionMs = totalPlaytimeMs / sessions.length;
      console.log(`Average session: ${formatDuration(avgSessionMs)}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const h = hours % 24;
  const m = minutes % 60;
  const s = seconds % 60;

  if (days > 0) {
    return `${days}d ${h}h ${m}m ${s}s`;
  } else if (hours > 0) {
    return `${hours}h ${m}m ${s}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${s}s`;
  } else {
    return `${seconds}s`;
  }
}

// Usage: node clone-hero-playtime.js [path-to-log-directory]
const logDir = process.argv[2] || './logs';
calculatePlaytime(logDir);