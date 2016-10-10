'use strict';

var BLHELI_S_SILABS_BASE_URL = 'https://raw.githubusercontent.com/bitdump/BLHeli_S SiLabs/{0}/SiLabs/Hex files/{1}_REV{2}.HEX';
var BLHELI_S_SILABS_VERSIONS = [
	{ version: '16.4', commit: '64fa296e67f9c995d7ae58d52b865730312b0c8a' },
	{ version: '16.3', commit: '623348759d8bb73f1f784f395f3a42df9b15e552' },
	{ version: '16.2', commit: '4300db1f557e3f1ad6a077610039d06e2fa5f189' },
	{ version: '16.1', commit: '6dfc545080bc1f74e65c7d5c5d974bf249950ac0' },
	{ version: '16.0', commit: 'de5ad83f6264df245ac52979901e1d3591dc655e' },
	{ version: '16.45 ', commit: 'e8b56843a95bc2ba217680df341a716250730c74'}
];

var BLHELI_SILABS_BASE_URL = 'https://raw.githubusercontent.com/bitdump/BLHeli/{0}/SiLabs/Hex files/{1}_{2}_REV{3}.HEX';
var BLHELI_SILABS_VERSIONS = [
	{ version: '14.8', commit: '1d0a8c489ccf09738f3ce895850694b352565af0' },
	{ version: '14.7', commit: '81e6a3bbb6762c5c4e809a9f11b7c65992a68c6c' },
	{ version: '14.6', commit: 'a374b0d2af46716c447ec88cadfa45879ccced70' },
	{ version: '14.5', commit: '6c3ce811d8f2a28e1de3be0218aa871f4bd8ea63' },
	{ version: '14.4', commit: 'c9f2d1ed9a00f41742ef418f95452dea1d53abb1' },
	{ version: '14.3', commit: 'a6c01051fec2f440868cd1e7dd4b305699ca604d' },
	{ version: '14.2', commit: '93b4cbca7bba32f3ac7ceed3739d77f66454728b' },
	{ version: '14.1', commit: '2e08b9913b139998d243bc153af6f6391b771f75' },
	{ version: '14.0', commit: 'fd08042abd0091d31dcb3b4d87759c34db95ea33' },
	{ version: '13.2', commit: 'be327449af1339421f56df6d3b17cd57f6f230cc' },
	{ version: '14.85 MultiShot Imperial March', commit: 'e8b56843a95bc2ba217680df341a716250730c74' },
	{ version: '14.85 MultiShot Fast Start', commit: 'e8b56843a95bc2ba217680df341a716250730c74' },
	{ version: '14.85 MultiShot Crazy Fast Start', commit: 'e8b56843a95bc2ba217680df341a716250730c74' }
];

var BLHELI_ATMEL_HEX_BASE_URL = 'https://raw.githubusercontent.com/bitdump/BLHeli/{0}/Atmel/Hex files/{1}_{2}_REV{3}.HEX';
var BLHELI_ATMEL_EEPROM_BASE_URL = 'https://raw.githubusercontent.com/bitdump/BLHeli/{0}/Atmel/Eeprom files/{1}_{2}_REV{3}.EEP';
var BLHELI_ATMEL_VERSIONS = [
	{ version: '14.8', commit: '1d0a8c489ccf09738f3ce895850694b352565af0' },
	{ version: '14.7', commit: '81e6a3bbb6762c5c4e809a9f11b7c65992a68c6c' },
	{ version: '14.6', commit: 'a374b0d2af46716c447ec88cadfa45879ccced70' },
	{ version: '14.5', commit: '6c3ce811d8f2a28e1de3be0218aa871f4bd8ea63' },
	{ version: '14.4', commit: 'c9f2d1ed9a00f41742ef418f95452dea1d53abb1' },
	{ version: '14.3', commit: 'a6c01051fec2f440868cd1e7dd4b305699ca604d' },
	{ version: '14.2', commit: '93b4cbca7bba32f3ac7ceed3739d77f66454728b' },
	{ version: '14.1', commit: '2e08b9913b139998d243bc153af6f6391b771f75' },
	{ version: '14.0', commit: 'fd08042abd0091d31dcb3b4d87759c34db95ea33' },
	{ version: '13.2', commit: 'be327449af1339421f56df6d3b17cd57f6f230cc' }
];
