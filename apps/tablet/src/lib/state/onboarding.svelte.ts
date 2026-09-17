// Onboarding state & completion persistence for the tablet kiosk.

const KEY_ONBOARDING_COMPLETED = 'atbots_tablet_onboarding_completed';
const KEY_TENANT_CODE = 'atbots_tenant_code';
const KEY_ROBOT_NAME = 'atbots_robot_name';

class OnboardingStore {
	completed = $state<boolean>(
		typeof localStorage !== 'undefined'
			? localStorage.getItem(KEY_ONBOARDING_COMPLETED) === 'true'
			: false
	);

	tenantCode = $state<string>(
		typeof localStorage !== 'undefined'
			? (localStorage.getItem(KEY_TENANT_CODE) ?? 'DEMO-SCHOOL-01')
			: 'DEMO-SCHOOL-01'
	);

	robotName = $state<string>(
		typeof localStorage !== 'undefined' ? (localStorage.getItem(KEY_ROBOT_NAME) ?? 'Aria') : 'Aria'
	);

	complete(tenantCode: string, robotName: string) {
		this.completed = true;
		this.tenantCode = tenantCode;
		this.robotName = robotName;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(KEY_ONBOARDING_COMPLETED, 'true');
			localStorage.setItem(KEY_TENANT_CODE, tenantCode);
			localStorage.setItem(KEY_ROBOT_NAME, robotName);
		}
	}

	reset() {
		this.completed = false;
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem(KEY_ONBOARDING_COMPLETED);
		}
	}
}

export const onboarding = new OnboardingStore();
