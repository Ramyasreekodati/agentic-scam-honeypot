/**
 * Generates believable but fake data to feed scammers.
 */
class BaitGenerator {
  generateFakeBankDetails(bankName = "State Bank") {
    const accNumber = Math.floor(1000000000 + Math.random() * 9000000000);
    const ifsc = `SBIN000${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      accountNumber: accNumber.toString(),
      ifsc: ifsc,
      holderName: "Dormant Holder",
      bank: bankName
    };
  }

  generateFakeUPI(name = "user") {
    const providers = ["okaxis", "okhdfcbank", "ybl", "paytm"];
    const provider = providers[Math.floor(Math.random() * providers.length)];
    return `${name.toLowerCase().replace(/\s/g, '')}${Math.floor(10 + Math.random() * 89)}@${provider}`;
  }

  generateFakeOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

module.exports = new BaitGenerator();
