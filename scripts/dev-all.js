/**
 * Unified dev runner: boots mock-cloud, mock-esp, tablet, and operator apps.
 */
import { spawn } from 'node:child_process';

const services = [
	{ name: 'cloud', cmd: 'npm', args: ['-w', '@atbots/mock-cloud', 'run', 'dev'], color: '\x1b[36m' },
	{ name: 'esp', cmd: 'npm', args: ['-w', '@atbots/mock-esp', 'run', 'dev'], color: '\x1b[35m' },
	{ name: 'tablet', cmd: 'npm', args: ['-w', '@atbots/tablet', 'run', 'dev', '--', '--port', '5173'], color: '\x1b[32m' },
	{ name: 'operator', cmd: 'npm', args: ['-w', '@atbots/operator', 'run', 'dev', '--', '--port', '5174'], color: '\x1b[33m' }
];

const children: ReturnType<typeof spawn>[] = [];

for (const { name, cmd, args, color } of services) {
	const child = spawn(cmd, args, { stdio: ['inherit', 'pipe', 'pipe'], shell: true });
	children.push(child);

	const prefix = `${color}[${name}]\x1b[0m `;
	child.stdout?.on('data', (d) => process.stdout.write(prefix + d.toString()));
	child.stderr?.on('data', (d) => process.stderr.write(prefix + d.toString()));
}

process.on('SIGINT', () => {
	for (const child of children) child.kill();
	process.exit(0);
});

process.on('SIGTERM', () => {
	for (const child of children) child.kill();
	process.exit(0);
});
