# ebs-csi.tf
#
# Without this, PersistentVolumeClaims stay stuck "Pending" forever —
# EKS does NOT include the EBS CSI driver by default on newer clusters.
# This is what actually lets Kubernetes provision a real EBS volume when
# postgres-pvc (or anything else) requests storage.
#
# Uses IRSA (IAM Roles for Service Accounts) — the CSI driver's pods run
# under a Kubernetes ServiceAccount that assumes this IAM role, scoped
# only to EBS volume permissions, rather than giving broad node-level
# AWS permissions. This is the real-world-correct pattern, not a shortcut.

data "aws_iam_policy_document" "ebs_csi_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.oidc_provider, "https://", "")}:sub"
      values   = ["system:serviceaccount:kube-system:ebs-csi-controller-sa"]
    }

    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.oidc_provider, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }

    principals {
      type        = "Federated"
      identifiers = [module.eks.oidc_provider_arn]
    }
  }
}

resource "aws_iam_role" "ebs_csi_driver" {
  name               = "${var.project_name}-ebs-csi-driver"
  assume_role_policy = data.aws_iam_policy_document.ebs_csi_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ebs_csi_driver" {
  role       = aws_iam_role.ebs_csi_driver.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

resource "aws_eks_addon" "ebs_csi_driver" {
  cluster_name             = module.eks.cluster_name
  addon_name               = "aws-ebs-csi-driver"
  service_account_role_arn = aws_iam_role.ebs_csi_driver.arn

  # Waits for the node group to actually exist before installing the
  # addon — installing too early can leave it stuck initializing.
  depends_on = [module.eks]
}
