namespace CyberShield360.Domain.Enums;

public enum SubscriptionPlan { Free = 0, Starter = 1, Professional = 2, Enterprise = 3, Agency = 4 }
public enum SubscriptionStatus { Trialing = 0, Active = 1, PastDue = 2, Canceled = 3, Incomplete = 4 }

public enum SecurityGrade { A = 5, B = 4, C = 3, D = 2, F = 1 }

public enum ScanType { Ssl = 0, HttpHeaders = 1, Dns = 2, Spf = 3, Dkim = 4, Dmarc = 5, FullPosture = 6 }
public enum ScanStatus { Queued = 0, Running = 1, Completed = 2, Failed = 3 }

public enum Severity { Info = 0, Low = 1, Medium = 2, High = 3, Critical = 4 }

public enum VulnerabilityStatus { Open = 0, InProgress = 1, Remediated = 2, Accepted = 3, FalsePositive = 4 }

public enum RiskStatus { Identified = 0, Assessed = 1, Mitigating = 2, Closed = 3 }
public enum RiskLikelihood { Rare = 1, Unlikely = 2, Possible = 3, Likely = 4, AlmostCertain = 5 }
public enum RiskImpact { Insignificant = 1, Minor = 2, Moderate = 3, Major = 4, Severe = 5 }

public enum PhishingCampaignStatus { Draft = 0, Scheduled = 1, Running = 2, Completed = 3, Canceled = 4 }
public enum PhishingResult { NotSent = 0, Delivered = 1, Opened = 2, Clicked = 3, Submitted = 4, Reported = 5 }

public enum TrainingStatus { NotStarted = 0, InProgress = 1, Completed = 2, Overdue = 3 }

public enum BrandAlertType { DomainSquatting = 0, FakeSocialAccount = 1, LeakedCredential = 2, PhishingSite = 3, TrademarkAbuse = 4 }
public enum AlertStatus { New = 0, Investigating = 1, Resolved = 2, Dismissed = 3 }

public enum NotificationChannel { Email = 0, InApp = 1, Webhook = 2 }
public enum AuditAction { Create = 0, Update = 1, Delete = 2, Login = 3, Logout = 4, Export = 5, ScanRun = 6, Invite = 7 }
